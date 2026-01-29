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

    # BLEManager va scanner tous les capteurs BLE déclarés dans la config (BLE_SENSORS)
    # et publier automatiquement chaque service BLE (temp, press, son, dist) sur MQTT
    ble_manager = BLEManager(config, mqtt)
    command_handler = CommandHandler(config, mqtt, ble_manager)

    await ble_manager.start()
    command_handler.start()

    # Vérification explicite des services attendus (optionnel, pour debug)
    expected_metrics = {"temperature", "pressure", "sound", "distance"}
    found_metrics = {s.metric for s in config.sensors}
    missing = expected_metrics - found_metrics
    if missing:
        print(f"[WARN] Services BLE manquants dans la config : {missing}")
    else:
        print("[INFO] Tous les services BLE attendus sont configurés.")


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

    command_handler.stop()
    await ble_manager.stop()
    mqtt.disconnect()


if __name__ == "__main__":
    asyncio.run(run())