import asyncio
import json
from typing import Optional

from config import AppConfig
from mqtt_client import MQTTClient, now_ts
from ble_manager import BLEManager


class CommandHandler:
    def __init__(self, config: AppConfig, mqtt: MQTTClient, ble_manager: BLEManager):
        self._config = config
        self._mqtt = mqtt
        self._ble_manager = ble_manager
        self._loop: Optional[asyncio.AbstractEventLoop] = None

    def start(self) -> None:
        self._loop = asyncio.get_running_loop()
        self._mqtt.set_message_callback(self._on_message)
        self._mqtt.subscribe("sensors/+/command", qos=1)

    def stop(self) -> None:
        self._mqtt.set_message_callback(lambda *_args: None)

    def _on_message(self, topic: str, payload: str) -> None:
        if not self._loop:
            return
        self._loop.call_soon_threadsafe(
            lambda: asyncio.create_task(self._handle_message(topic, payload))
        )

    async def _handle_message(self, topic: str, payload: str) -> None:
        sensor_id = self._extract_sensor_id(topic)
        if not sensor_id:
            return

        try:
            data = json.loads(payload) if payload else {}
        except json.JSONDecodeError:
            data = {}

        request_id = data.get("request_id")
        if not isinstance(request_id, str):
            await self._publish_ack(sensor_id, request_id, ok=False, reason="request_id_missing")
            return

        ok, reason = await self._ble_manager.send_command(sensor_id, data)
        await self._publish_ack(sensor_id, request_id, ok=ok, reason=reason)

    async def _publish_ack(self, sensor_id: str, request_id: Optional[str], ok: bool, reason: str) -> None:
        payload = {
            "request_id": request_id,
            "ok": ok,
            "ts": now_ts(),
        }
        if not ok:
            payload["reason"] = reason
        topic = f"sensors/{sensor_id}/ack"
        self._mqtt.publish_json(topic, payload, qos=1, retain=False)

    @staticmethod
    def _extract_sensor_id(topic: str) -> Optional[str]:
        parts = topic.split("/")
        if len(parts) >= 3 and parts[0] == "sensors" and parts[2] == "command":
            return parts[1]
        return None
