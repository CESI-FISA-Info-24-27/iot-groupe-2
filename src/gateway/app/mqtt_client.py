import paho.mqtt.client as mqtt

class MQTTClient:
    def __init__(self, config):
        self.topic = config["topic"]
        self.client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, config["client_id"])
        self.client.connect(config["broker"], config["port"], 60)
        self.client.loop_start()

    def publish(self, payload: str):
        self.client.publish(self.topic, payload)