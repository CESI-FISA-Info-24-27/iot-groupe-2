import yaml
import asyncio
import os
from ble_client import BLEClient
from mqtt_client import MQTTClient
from bridge import BLEMQTTBridge

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
config_path = os.environ.get("CONFIG_FILE", os.path.join(BASE_DIR, "../config/config.yaml"))

with open(config_path, 'r') as f:
    config = yaml.safe_load(f)

ble = BLEClient(config["ble"])
mqtt = MQTTClient(config["mqtt"])

bridge = BLEMQTTBridge(
    ble,
    mqtt,
    config["ble"]["scan_interval"]
)

asyncio.run(bridge.run())