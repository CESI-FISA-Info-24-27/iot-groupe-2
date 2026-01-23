from bleak import BleakScanner, BleakClient

class BLEClient:
    def __init__(self, config):
        self.device_name = config["device_name"]
        self.char_uuid = config["characteristic_uuid"]
        self.device_address = None
        self.client = None

    async def connect(self):
        if not self.device_address:
            devices = await BleakScanner.discover(timeout=5.0)
            device = next(
                (d for d in devices if d.name == self.device_name),
                None
            )
            if not device:
                raise RuntimeError("BLE device not found")

            self.device_address = device.address

        if not self.client or not await self.client.is_connected():
            self.client = BleakClient(self.device_address)
            await self.client.connect()

    async def read_value(self):
        await self.connect()
        value = await self.client.read_gatt_char(self.char_uuid)
        return value.decode(errors="ignore")