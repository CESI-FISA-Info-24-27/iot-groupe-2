import paho.mqtt.client as mqtt
import json
from typing import Callable, List, Dict, Any, Optional
from config.env import settings


class Subscription:
    def __init__(self, filter: str, handler: Callable):
        self.filter = filter
        self.handler = handler


class MQTTService:
    def __init__(self):
        self.client: Optional[mqtt.Client] = None
        self.callbacks: List[Callable] = []
        self.subscriptions: List[Subscription] = []
        self.connected = False

    def connect(self):
        """Connect to MQTT broker"""
        self.client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
        
        if settings.mqtt.username:
            self.client.username_pw_set(
                settings.mqtt.username,
                settings.mqtt.password
            )

        self.client.on_connect = self._on_connect
        self.client.on_message = self._on_message
        self.client.on_disconnect = self._on_disconnect

        broker_url = settings.mqtt.host
        port = settings.mqtt.port

        try:
            self.client.connect(broker_url, port, 60)
            self.client.loop_start()
        except Exception as e:
            print(f"MQTT connection error: {e}")
            raise

    def _on_connect(self, client, userdata, flags, reason_code, properties):
        """Callback when connected to MQTT broker"""
        if reason_code == 0:
            self.connected = True
            print("✓ Connected to MQTT broker")
            
            # Subscribe to all registered topics
            for sub in self.subscriptions:
                client.subscribe(sub.filter)
                print(f"✓ Subscribed to {sub.filter}")
        else:
            print(f"MQTT connection failed with code {reason_code}")

    def _on_message(self, client, userdata, msg):
        """Callback when message is received"""
        topic = msg.topic
        raw_message = msg.payload.decode('utf-8')
        payload = None

        try:
            payload = json.loads(raw_message)
            if settings.debug:
                print(f"MQTT message on {topic}: {payload}")
        except json.JSONDecodeError as e:
            print(f"Error parsing MQTT message: {e}")
            return

        # Notify all registered callbacks
        for callback in self.callbacks:
            try:
                callback(topic, payload)
            except Exception as e:
                print(f"Error in MQTT callback: {e}")

        # Notify matching topic handlers
        for sub in self.subscriptions:
            if self._matches_topic(sub.filter, topic):
                try:
                    sub.handler(topic, payload, raw_message)
                except Exception as e:
                    print(f"Error in MQTT subscription handler: {e}")

    def _on_disconnect(self, client, userdata, reason_code, properties=None, *_args):
        """Callback when disconnected from MQTT broker"""
        self.connected = False
        print(f"MQTT client disconnected (code: {reason_code})")

    def subscribe(self, filter: str, handler: Optional[Callable] = None):
        """Subscribe to MQTT topic with optional handler"""
        handler = handler or (lambda topic, payload, raw: None)
        sub = Subscription(filter, handler)
        self.subscriptions.append(sub)

        if self.client and self.connected:
            self.client.subscribe(filter)
            print(f"✓ Subscribed to {filter}")

    def subscribe_telemetry(self, handler: Callable):
        """Subscribe specifically to telemetry topics"""
        self.subscribe("sensors/+/telemetry", handler)

    def publish(self, topic: str, payload: Dict[str, Any], qos: int = 1):
        """Publish message to MQTT topic"""
        if self.client and self.connected:
            message = json.dumps(payload)
            self.client.publish(topic, message, qos=qos)

    def on_message(self, callback: Callable):
        """Register a callback for all messages"""
        self.callbacks.append(callback)

    def is_connected(self) -> bool:
        """Check if MQTT client is connected"""
        return self.connected

    def disconnect(self):
        """Disconnect from MQTT broker"""
        if self.client:
            self.client.loop_stop()
            self.client.disconnect()
            print("MQTT client disconnected")

    @staticmethod
    def _matches_topic(filter: str, topic: str) -> bool:
        """Check if topic matches MQTT filter pattern"""
        filter_levels = filter.split("/")
        topic_levels = topic.split("/")

        for i, filter_level in enumerate(filter_levels):
            if filter_level == "#":
                return True

            if i >= len(topic_levels):
                return False

            if filter_level == "+":
                continue

            if filter_level != topic_levels[i]:
                return False

        return len(filter_levels) == len(topic_levels)


# Singleton instance
mqtt_service = MQTTService()
