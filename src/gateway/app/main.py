import asyncio
import signal
from config import load_config
from mqtt_client import MQTTClient
from ble_manager import BLEManager
from command_handler import CommandHandler


async def run() -> None:
    config = load_config()

    mqtt = MQTTClient(config.mqtt)
    mqtt.connect()

    ble_manager = BLEManager(config, mqtt)
    command_handler = CommandHandler(config, mqtt, ble_manager)

    await ble_manager.start()
    command_handler.start()

    stop_event = asyncio.Event()

    def _handle_stop(*_args) -> None:
        stop_event.set()

    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, _handle_stop)

    await stop_event.wait()

    command_handler.stop()
    await ble_manager.stop()
    mqtt.disconnect()


if __name__ == "__main__":
    asyncio.run(run())
