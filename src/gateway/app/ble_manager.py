import asyncio
import json
import random
from dataclasses import dataclass
from typing import Dict, Optional, Tuple

from bleak import BleakClient, BleakScanner

from config import AppConfig, BleSensorConfig
from mqtt_client import MQTTClient, now_ts


@dataclass
class Telemetry:
    sensor_id: str
    room: str
    metric: str
    value: object
    ts: int


class BLEManager:
    def __init__(self, config: AppConfig, mqtt: MQTTClient):
        self._config = config
        self._mqtt = mqtt
        self._tasks: Dict[str, asyncio.Task] = {}
        self._clients: Dict[str, BleakClient] = {}
        self._stop_event = asyncio.Event()

    async def start(self) -> None:
        for sensor in self._config.sensors:
            if sensor.sensor_id in self._tasks:
                continue
            task = asyncio.create_task(self._run_sensor(sensor))
            self._tasks[sensor.sensor_id] = task

    async def stop(self) -> None:
        self._stop_event.set()
        for task in self._tasks.values():
            task.cancel()
        await asyncio.gather(*self._tasks.values(), return_exceptions=True)
        for client in self._clients.values():
            if client.is_connected:
                await client.disconnect()

    async def send_command(self, sensor_id: str, payload: dict) -> Tuple[bool, str]:
        sensor = next((s for s in self._config.sensors if s.sensor_id == sensor_id), None)
        if not sensor:
            return False, "unknown_sensor"

        if sensor.simulated:
            return True, "simulated"

        if not sensor.command_uuid:
            return False, "command_uuid_missing"

        client = self._clients.get(sensor_id)
        if not client or not client.is_connected:
            return False, "ble_not_connected"

        try:
            data = json.dumps(payload, ensure_ascii=True).encode("utf-8")
            await client.write_gatt_char(sensor.command_uuid, data, response=True)
            return True, "written"
        except Exception:
            return False, "ble_write_failed"

    async def _run_sensor(self, sensor: BleSensorConfig) -> None:
        if sensor.simulated:
            await self._run_simulated_sensor(sensor)
            return

        while not self._stop_event.is_set():
            disconnect_event = asyncio.Event()
            connected = False
            offline_published = False

            def _on_disconnect(_client) -> None:
                disconnect_event.set()

            try:
                device = await self._find_device(sensor)
                if not device:
                    await asyncio.sleep(self._config.scan_interval)
                    continue

                client = BleakClient(device, disconnected_callback=_on_disconnect)
                await client.connect()
                self._clients[sensor.sensor_id] = client
                connected = True
                self._publish_status(sensor, "ONLINE")

                if sensor.mode == "notify" and sensor.telemetry_uuid:
                    await client.start_notify(
                        sensor.telemetry_uuid,
                        lambda _sender, data: asyncio.create_task(
                            self._handle_ble_value(sensor, data)
                        ),
                    )
                    await disconnect_event.wait()
                else:
                    await self._read_loop(sensor, client, disconnect_event)
            except asyncio.CancelledError:
                break
            except Exception as exc:
                self._publish_status(sensor, "OFFLINE", reason=str(exc))
                offline_published = True
            finally:
                if connected and not offline_published:
                    self._publish_status(sensor, "OFFLINE", reason="ble_disconnect")
                client = self._clients.pop(sensor.sensor_id, None)
                if client and client.is_connected:
                    await client.disconnect()

            await asyncio.sleep(self._config.reconnect_delay)

    async def _run_simulated_sensor(self, sensor: BleSensorConfig) -> None:
        self._publish_status(sensor, "ONLINE")
        while not self._stop_event.is_set():
            value = round(random.uniform(20, 30), 2)
            telemetry = Telemetry(
                sensor_id=sensor.sensor_id,
                room=sensor.room,
                metric=sensor.metric,
                value=value,
                ts=now_ts(),
            )
            self._publish_telemetry(telemetry)
            await asyncio.sleep(sensor.read_interval)
        self._publish_status(sensor, "OFFLINE", reason="stopped")

    async def _read_loop(
        self, sensor: BleSensorConfig, client: BleakClient, disconnect_event: asyncio.Event
    ) -> None:
        if not sensor.telemetry_uuid:
            raise RuntimeError("telemetry_uuid_missing")

        while not self._stop_event.is_set() and not disconnect_event.is_set():
            data = await client.read_gatt_char(sensor.telemetry_uuid)
            await self._handle_ble_value(sensor, data)
            await asyncio.sleep(sensor.read_interval)

    async def _handle_ble_value(self, sensor: BleSensorConfig, data: bytes) -> None:
        payload = self._parse_payload(sensor, data)
        telemetry = Telemetry(
            sensor_id=sensor.sensor_id,
            room=sensor.room,
            metric=payload["metric"],
            value=payload["value"],
            ts=payload["ts"],
        )
        self._publish_telemetry(telemetry)

    def _parse_payload(self, sensor: BleSensorConfig, data: bytes) -> dict:
        text = data.decode("utf-8", errors="ignore").strip()
        ts = now_ts()

        if text:
            try:
                decoded = json.loads(text)
                if isinstance(decoded, dict) and "value" in decoded:
                    metric = decoded.get("metric", sensor.metric)
                    return {"metric": metric, "value": decoded["value"], "ts": decoded.get("ts", ts)}
            except json.JSONDecodeError:
                pass

            if ":" in text:
                metric, value = text.split(":", 1)
                return {"metric": metric.strip() or sensor.metric, "value": value.strip(), "ts": ts}

            try:
                numeric = float(text)
                return {"metric": sensor.metric, "value": numeric, "ts": ts}
            except ValueError:
                return {"metric": sensor.metric, "value": text, "ts": ts}

        return {"metric": sensor.metric, "value": None, "ts": ts}

    async def _find_device(self, sensor: BleSensorConfig):
        if sensor.address:
            return sensor.address

        devices = await BleakScanner.discover(timeout=self._config.scan_interval)
        for device in devices:
            if sensor.name and device.name == sensor.name:
                return device
        return None

    def _publish_status(self, sensor: BleSensorConfig, status: str, reason: Optional[str] = None) -> None:
        payload = {"status": status, "ts": now_ts()}
        if reason:
            payload["reason"] = reason
        topic = f"sensors/{sensor.sensor_id}/status"
        self._mqtt.publish_json(topic, payload, qos=1, retain=True)

    def _publish_telemetry(self, telemetry: Telemetry) -> None:
        topic = f"sensors/{telemetry.sensor_id}/telemetry"
        payload = {
            "room": telemetry.room,
            "sensor_id": telemetry.sensor_id,
            "metric": telemetry.metric,
            "value": telemetry.value,
            "ts": telemetry.ts,
        }
        self._mqtt.publish_json(topic, payload, qos=1, retain=False)
