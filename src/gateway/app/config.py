import os
from dataclasses import dataclass
from typing import List, Optional

from dotenv import load_dotenv


@dataclass(frozen=True)
class MqttConfig:
    host: str
    port: int
    username: Optional[str]
    password: Optional[str]
    tls: bool
    tls_ca: Optional[str]
    tls_insecure: bool


@dataclass(frozen=True)
class BleSensorConfig:
    sensor_id: str
    room: str
    name: Optional[str]
    address: Optional[str]
    telemetry_uuid: Optional[str]
    command_uuid: Optional[str]
    mode: str
    read_interval: float
    metric: str
    simulated: bool


@dataclass(frozen=True)
class AppConfig:
    mqtt: MqttConfig
    sensors: List[BleSensorConfig]
    scan_interval: float
    reconnect_delay: float


def _parse_bool(value: Optional[str], default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "y"}


def _parse_sensors(raw: str) -> List[BleSensorConfig]:
    sensors: List[BleSensorConfig] = []
    if not raw:
        return sensors

    entries = [entry.strip() for entry in raw.split(",") if entry.strip()]
    for entry in entries:
        parts = [part.strip() for part in entry.split("|")]
        if len(parts) < 1:
            continue

        sensor_id = parts[0]
        room = parts[1] if len(parts) > 1 and parts[1] else "C4"
        name = parts[2] if len(parts) > 2 and parts[2] else None
        address = parts[3] if len(parts) > 3 and parts[3] else None
        telemetry_uuid = parts[4] if len(parts) > 4 and parts[4] else None
        command_uuid = parts[5] if len(parts) > 5 and parts[5] else None
        mode = parts[6].lower() if len(parts) > 6 and parts[6] else "notify"
        read_interval = float(parts[7]) if len(parts) > 7 and parts[7] else 2.0
        metric = parts[8] if len(parts) > 8 and parts[8] else "temperature"
        simulated = _parse_bool(parts[9], default=False) if len(parts) > 9 else False

        sensors.append(
            BleSensorConfig(
                sensor_id=sensor_id,
                room=room,
                name=name,
                address=address,
                telemetry_uuid=telemetry_uuid,
                command_uuid=command_uuid,
                mode=mode,
                read_interval=read_interval,
                metric=metric,
                simulated=simulated,
            )
        )

    return sensors


def _default_simulated_sensors() -> List[BleSensorConfig]:
    return [
        BleSensorConfig(
            sensor_id="ble-sim-01",
            room="C4",
            name="Simulated Sensor",
            address=None,
            telemetry_uuid=None,
            command_uuid=None,
            mode="notify",
            read_interval=2.0,
            metric="temperature",
            simulated=True,
        )
    ]


def _sensors_from_env() -> List[BleSensorConfig]:
    # Construction explicite des capteurs à partir des variables d'environnement
    sensors = []
    # Mode "JSON" (un seul service / une seule caractéristique)
    json_uuid = os.environ.get("BLE_JSON_CHAR_UUID")
    if json_uuid:
        sensors.append(BleSensorConfig(
            sensor_id=os.environ.get("BLE_SENSOR_ID", "ble-ecoguard"),
            room=os.environ.get("BLE_ROOM", "C4"),
            name=os.environ.get("BLE_DEVICE_NAME", "ESP32_Capteurs"),
            address=os.environ.get("BLE_DEVICE_ADDRESS") or None,
            telemetry_uuid=json_uuid,
            command_uuid=os.environ.get("BLE_COMMAND_CHAR_UUID") or None,
            mode="notify",
            read_interval=float(os.environ.get("BLE_READ_INTERVAL", "1.0")),
            metric="json",
            simulated=False,
        ))
        return sensors

    # Température
    temp_uuid = os.environ.get("CHAR_TEMP_UUID")
    if temp_uuid:
        sensors.append(BleSensorConfig(
            sensor_id="ble-temp",
            room="C4",
            name="ESP32_Capteurs",
            address=None,
            telemetry_uuid=temp_uuid,
            command_uuid=None,
            mode="notify",
            read_interval=2.0,
            metric="temperature",
            simulated=False,
        ))
    # Pression
    press_uuid = os.environ.get("CHAR_PRESSURE_UUID")
    if press_uuid:
        sensors.append(BleSensorConfig(
            sensor_id="ble-press",
            room="C4",
            name="ESP32_Capteurs",
            address=None,
            telemetry_uuid=press_uuid,
            command_uuid=None,
            mode="notify",
            read_interval=2.0,
            metric="pressure",
            simulated=False,
        ))
    # Son
    sound_uuid = os.environ.get("CHAR_SOUND_UUID")
    if sound_uuid:
        sensors.append(BleSensorConfig(
            sensor_id="ble-son",
            room="C4",
            name="ESP32_Capteurs",
            address=None,
            telemetry_uuid=sound_uuid,
            command_uuid=None,
            mode="notify",
            read_interval=2.0,
            metric="sound",
            simulated=False,
        ))
    # Distance
    dist_uuid = os.environ.get("CHAR_DISTANCE_UUID")
    if dist_uuid:
        sensors.append(BleSensorConfig(
            sensor_id="ble-dist",
            room="C4",
            name="ESP32_Capteurs",
            address=None,
            telemetry_uuid=dist_uuid,
            command_uuid=None,
            mode="notify",
            read_interval=2.0,
            metric="distance",
            simulated=False,
        ))
    return sensors

def load_config() -> AppConfig:
    load_dotenv()

    mqtt = MqttConfig(
        host=os.environ.get("MQTT_BROKER_HOST", "localhost"),
        port=int(os.environ.get("MQTT_BROKER_PORT", "1883")),
        username=os.environ.get("MQTT_BROKER_USERNAME") or None,
        password=os.environ.get("MQTT_BROKER_PASSWORD") or None,
        tls=_parse_bool(os.environ.get("MQTT_TLS"), default=False),
        tls_ca=os.environ.get("MQTT_TLS_CA") or None,
        tls_insecure=_parse_bool(os.environ.get("MQTT_TLS_INSECURE"), default=False),
    )

    scan_interval = float(os.environ.get("BLE_SCAN_INTERVAL", "5"))
    reconnect_delay = float(os.environ.get("BLE_RECONNECT_DELAY", "5"))

    # Capteurs BLE depuis les variables d'environnement explicites
    sensors = _sensors_from_env()
    if not sensors:
        # fallback : BLE_SENSORS (format compact)
        sensors_raw = os.environ.get("BLE_SENSORS", "")
        sensors = _parse_sensors(sensors_raw)
    if not sensors:
        sensors = _default_simulated_sensors()

    return AppConfig(
        mqtt=mqtt,
        sensors=sensors,
        scan_interval=scan_interval,
        reconnect_delay=reconnect_delay,
    )
