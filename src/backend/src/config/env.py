import os
from typing import Optional
from pydantic_settings import BaseSettings


class MQTTSettings(BaseSettings):
    host: str = "localhost"
    port: int = 1883
    username: str = ""
    password: str = ""

    class Config:
        env_prefix = "MQTT_"


class InfluxSettings(BaseSettings):
    url: str = "http://localhost:8086"
    org: str = "EcoGuard"
    bucket: str = "sensors"
    token: str = ""

    class Config:
        env_prefix = "INFLUX_"


class Settings(BaseSettings):
    port: int = 3000
    cors_origin: str = "*"
    debug: bool = False
    env: str = "development"

    mqtt: MQTTSettings = MQTTSettings()
    influx: InfluxSettings = InfluxSettings()

    class Config:
        env_file = ".env"
        env_nested_delimiter = "__"


# Singleton instance
settings = Settings(
    mqtt=MQTTSettings(),
    influx=InfluxSettings()
)