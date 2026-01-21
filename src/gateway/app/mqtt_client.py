import json
import threading
import time
from typing import Any, Callable, Optional

import paho.mqtt.client as mqtt

from config import MqttConfig


class MQTTClient:
    def __init__(self, config: MqttConfig):
        self._config = config
        self._client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
        self._connected = threading.Event()
        self._message_callback: Optional[Callable[[str, str], None]] = None

        if config.username:
            self._client.username_pw_set(config.username, config.password or "")

        if config.tls:
            if config.tls_ca:
                self._client.tls_set(ca_certs=config.tls_ca)
            else:
                self._client.tls_set()
            if config.tls_insecure:
                self._client.tls_insecure_set(True)

        self._client.on_connect = self._on_connect
        self._client.on_disconnect = self._on_disconnect
        self._client.on_message = self._on_message

    def connect(self) -> None:
        self._client.connect(self._config.host, self._config.port, keepalive=60)
        self._client.loop_start()

    def disconnect(self) -> None:
        self._client.loop_stop()
        self._client.disconnect()

    def wait_until_connected(self, timeout: float = 10.0) -> bool:
        return self._connected.wait(timeout)

    def publish_json(self, topic: str, payload: dict, qos: int = 1, retain: bool = False) -> None:
        message = json.dumps(payload, ensure_ascii=True)
        self._client.publish(topic, message, qos=qos, retain=retain)

    def subscribe(self, topic: str, qos: int = 1) -> None:
        self._client.subscribe(topic, qos=qos)

    def set_message_callback(self, callback: Callable[[str, str], None]) -> None:
        self._message_callback = callback

    def _on_connect(self, _client, _userdata, _flags, rc, _properties=None) -> None:
        if rc == 0:
            self._connected.set()
        else:
            self._connected.clear()

    def _on_disconnect(self, _client, _userdata, _rc, _properties=None, *_args) -> None:
        self._connected.clear()

    def _on_message(self, _client, _userdata, msg) -> None:
        if not self._message_callback:
            return
        try:
            payload = msg.payload.decode("utf-8", errors="ignore")
        except Exception:
            payload = ""
        self._message_callback(msg.topic, payload)


def now_ts() -> int:
    return int(time.time())
