import asyncio
import json
import random
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

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
        self._device_tasks: Dict[str, asyncio.Task] = {}
        self._clients: Dict[str, BleakClient] = {}
        self._stop_event = asyncio.Event()
        self._scan_lock = asyncio.Lock()

    async def start(self) -> None:
        device_groups: Dict[str, List[BleSensorConfig]] = {}

        for sensor in self._config.sensors:
            if sensor.simulated:
                if sensor.sensor_id in self._tasks:
                    continue
                task = asyncio.create_task(self._run_sensor(sensor))
                self._tasks[sensor.sensor_id] = task
                continue

            key = self._device_key(sensor)
            device_groups.setdefault(key, []).append(sensor)

        for key, sensors in device_groups.items():
            if key in self._device_tasks:
                continue
            task = asyncio.create_task(self._run_device_group(key, sensors))
            self._device_tasks[key] = task

    async def stop(self) -> None:
        self._stop_event.set()
        for task in list(self._tasks.values()) + list(self._device_tasks.values()):
            task.cancel()
        await asyncio.gather(
            *list(self._tasks.values()),
            *list(self._device_tasks.values()),
            return_exceptions=True,
        )
        for client in set(self._clients.values()):
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
        print(f"[BLE] Démarrage du capteur {sensor.sensor_id} ({sensor.metric})")
        if sensor.simulated:
            await self._run_simulated_sensor(sensor)
            return

        while not self._stop_event.is_set():
            disconnect_event = asyncio.Event()
            connected = False
            offline_published = False

            def _on_disconnect(_client) -> None:
                print(f"[BLE] Déconnexion du capteur {sensor.sensor_id}")
                disconnect_event.set()

            try:
                device = await self._find_device(sensor)
                if not device:
                    print(f"[BLE] Capteur {sensor.sensor_id} non trouvé, nouvel essai dans {self._config.scan_interval}s")
                    await asyncio.sleep(self._config.scan_interval)
                    continue

                print(f"[BLE] Connexion au capteur {sensor.sensor_id} ({device})...")
                client = BleakClient(device, disconnected_callback=_on_disconnect)
                await client.connect()
                self._clients[sensor.sensor_id] = client
                connected = True
                print(f"[BLE] Capteur {sensor.sensor_id} connecté !")
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
                print(f"[BLE][ERREUR] Capteur {sensor.sensor_id} : {exc}")
                self._publish_status(sensor, "OFFLINE", reason=str(exc))
                offline_published = True
            finally:
                if connected and not offline_published:
                    self._publish_status(sensor, "OFFLINE", reason="ble_disconnect")
                client = self._clients.pop(sensor.sensor_id, None)
                if client and client.is_connected:
                    await client.disconnect()

            await asyncio.sleep(self._config.reconnect_delay)

    async def _run_device_group(self, key: str, sensors: List[BleSensorConfig]) -> None:
        sensor_ids = ", ".join(sensor.sensor_id for sensor in sensors)
        print(f"[BLE] Démarrage du groupe {key} ({sensor_ids})")

        while not self._stop_event.is_set():
            disconnect_event = asyncio.Event()
            connected = False
            offline_published = False
            client: Optional[BleakClient] = None
            notify_uuids: List[Tuple[BleSensorConfig, str]] = []
            read_tasks: List[asyncio.Task] = []

            def _on_disconnect(_client) -> None:
                print(f"[BLE] Déconnexion du groupe {key}")
                disconnect_event.set()

            try:
                device = await self._find_device_group(sensors)
                if not device:
                    print(f"[BLE] Groupe {key} non trouvé, nouvel essai dans {self._config.scan_interval}s")
                    await asyncio.sleep(self._config.scan_interval)
                    continue

                print(f"[BLE] Connexion au groupe {key} ({device})...")
                client = BleakClient(device, disconnected_callback=_on_disconnect)
                await client.connect()
                connected = True
                print(f"[BLE] Groupe {key} connecté !")

                for sensor in sensors:
                    self._clients[sensor.sensor_id] = client
                    self._publish_status(sensor, "ONLINE")

                for sensor in sensors:
                    if sensor.telemetry_uuid and sensor.mode == "notify":
                        notify_uuids.append((sensor, sensor.telemetry_uuid))

                for sensor, telemetry_uuid in notify_uuids:
                    await client.start_notify(
                        telemetry_uuid,
                        lambda _sender, data, s=sensor: asyncio.create_task(
                            self._handle_ble_value(s, data)
                        ),
                    )

                for sensor in sensors:
                    if sensor.mode != "notify":
                        read_tasks.append(
                            asyncio.create_task(self._read_loop(sensor, client, disconnect_event))
                        )

                disconnect_task = asyncio.create_task(disconnect_event.wait())
                stop_task = asyncio.create_task(self._stop_event.wait())
                done, pending = await asyncio.wait(
                    [disconnect_task, stop_task],
                    return_when=asyncio.FIRST_COMPLETED,
                )
                for task in pending:
                    task.cancel()
                await asyncio.gather(*pending, return_exceptions=True)
            except asyncio.CancelledError:
                break
            except Exception as exc:
                print(f"[BLE][ERREUR] Groupe {key} : {exc}")
                for sensor in sensors:
                    self._publish_status(sensor, "OFFLINE", reason=str(exc))
                offline_published = True
            finally:
                for task in read_tasks:
                    task.cancel()
                if read_tasks:
                    await asyncio.gather(*read_tasks, return_exceptions=True)

                if client and client.is_connected:
                    for sensor, telemetry_uuid in notify_uuids:
                        try:
                            await client.stop_notify(telemetry_uuid)
                        except Exception:
                            pass

                if connected and not offline_published:
                    for sensor in sensors:
                        self._publish_status(sensor, "OFFLINE", reason="ble_disconnect")

                for sensor in sensors:
                    self._clients.pop(sensor.sensor_id, None)

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
        text = data.decode("utf-8", errors="ignore").strip()
        if text:
            try:
                decoded = json.loads(text)
            except json.JSONDecodeError:
                decoded = None

            if isinstance(decoded, dict) and decoded.get("sensor_type"):
                self._publish_ecoguard(decoded, sensor)
                return

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
        async with self._scan_lock:
            devices = await BleakScanner.discover(timeout=self._config.scan_interval)
        for device in devices:
            if sensor.address and device.address and device.address.lower() == sensor.address.lower():
                return device
            if sensor.name and device.name == sensor.name:
                return device
        return None

    async def _find_device_group(self, sensors: List[BleSensorConfig]):
        async with self._scan_lock:
            devices = await BleakScanner.discover(timeout=self._config.scan_interval)

        wanted_addresses = {
            s.address.lower() for s in sensors if s.address
        }
        wanted_names = {s.name for s in sensors if s.name}

        for device in devices:
            if device.address and device.address.lower() in wanted_addresses:
                return device
            if device.name and device.name in wanted_names:
                return device
        return None

    def _device_key(self, sensor: BleSensorConfig) -> str:
        if sensor.address:
            return sensor.address.lower()
        if sensor.name:
            return sensor.name
        return sensor.sensor_id

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

    def _publish_ecoguard(self, payload: dict, sensor: BleSensorConfig) -> None:
        room_id = payload.get("room_id") or sensor.room
        sensor_type = payload.get("sensor_type") or payload.get("metric") or sensor.metric

        if room_id:
            payload["room_id"] = room_id
        if sensor_type:
            payload["sensor_type"] = sensor_type

        topic = f"ecoguard/sensors/{room_id}/{sensor_type}"
        self._mqtt.publish_json(topic, payload, qos=1, retain=False)
