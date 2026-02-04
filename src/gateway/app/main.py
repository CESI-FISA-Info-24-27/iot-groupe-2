import asyncio
import json
import signal
from typing import Optional, Tuple

from config import load_config
from mqtt_client import MQTTClient, now_ts


def _parse_ecoguard_topic(topic: str) -> Tuple[Optional[str], Optional[str]]:
    parts = topic.split("/")
    if len(parts) >= 4 and parts[0] == "ecoguard" and parts[1] == "sensors":
        return parts[2], parts[3]
    return None, None


def _normalize_payload(topic: str, payload: dict) -> Optional[dict]:
    room_from_topic, metric_from_topic = _parse_ecoguard_topic(topic)

    room = payload.get("room_id") or payload.get("room") or room_from_topic
    metric = payload.get("sensor_type") or payload.get("metric") or metric_from_topic
    sensor_id = payload.get("device_id") or payload.get("sensor_id") or payload.get("parent_device_id")
    value = payload.get("value", payload.get("amplitude"))
    ts = payload.get("timestamp", payload.get("ts", now_ts()))

    if not all([room, metric, sensor_id]) or value is None:
        return None

    return {
        "room": room,
        "sensor_id": sensor_id,
        "metric": metric,
        "value": value,
        "ts": ts,
    }


async def run() -> None:
    config = load_config()
    mqtt = MQTTClient(config.mqtt)
    mqtt.connect()

    def _on_message(topic: str, raw_payload: str) -> None:
        try:
            payload = json.loads(raw_payload) if raw_payload else {}
        except json.JSONDecodeError:
            payload = {}

        normalized = _normalize_payload(topic, payload)
        if not normalized:
            return

        out_topic = f"sensors/{normalized['sensor_id']}/telemetry"
        mqtt.publish_json(out_topic, normalized, qos=1, retain=False)

    mqtt.set_message_callback(_on_message)
    mqtt.subscribe("ecoguard/sensors/#", qos=1)

    stop_event = asyncio.Event()

    def _handle_stop(*_args):
        stop_event.set()

    loop = asyncio.get_running_loop()
    try:
        for sig in (signal.SIGINT, signal.SIGTERM):
            loop.add_signal_handler(sig, _handle_stop)
        await stop_event.wait()
    except NotImplementedError:
        try:
            await stop_event.wait()
        except KeyboardInterrupt:
            pass

    mqtt.disconnect()


if __name__ == "__main__":
    asyncio.run(run())
