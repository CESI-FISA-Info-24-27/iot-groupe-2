require("dotenv").config();

module.exports = {
  port: process.env.PORT || 3000,
  wsPort: process.env.WS_PORT || 8080,

  mqtt: {
    broker: process.env.MQTT_BROKER || "mqtt://localhost:1883",
    username: process.env.MQTT_USERNAME || "",
    password: process.env.MQTT_PASSWORD || "",
    topics: {
      sensors: process.env.MQTT_TOPIC_SENSORS || "iot/sensors/#",
      camera: process.env.MQTT_TOPIC_CAMERA || "iot/camera/#",
    },
  },

  mongodb: {
    uri: process.env.MONGODB_URI || "mongodb://localhost:27017/iot-db",
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    },
  },

  env: process.env.NODE_ENV || "development",
};
