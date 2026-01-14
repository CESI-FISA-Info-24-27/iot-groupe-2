require("dotenv").config();

module.exports = {
  port: process.env.PORT || 3000,

  mqtt: {
    host: process.env.MQTT_HOST || "localhost",
    port: parseInt(process.env.MQTT_PORT || "1883", 10),
    username: process.env.MQTT_USERNAME || "",
    password: process.env.MQTT_PASSWORD || "",
  },

  influx: {
    url: process.env.INFLUX_URL || "http://localhost:8086",
    org: process.env.INFLUX_ORG || "EcoGuard",
    bucket: process.env.INFLUX_BUCKET || "sensors",
    token: process.env.INFLUX_TOKEN || "",
  },

  env: process.env.NODE_ENV || "development",
};
