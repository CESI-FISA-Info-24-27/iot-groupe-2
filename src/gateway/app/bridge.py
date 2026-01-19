import asyncio

class BLEMQTTBridge:
    def __init__(self, ble_client, mqtt_client, interval):
        self.ble = ble_client
        self.mqtt = mqtt_client
        self.interval = interval

    async def run(self):
        while True:
            try:
                data = await self.ble.read_value()
                self.mqtt.publish(data)
                print(f"Published: {data}")
                await asyncio.sleep(self.interval)

            except Exception as e:
                print(f"Error: {e}")
                await asyncio.sleep(5)