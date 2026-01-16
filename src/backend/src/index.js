const http = require("http");
const app = require("./app");
const config = require("./config/env");
const mqttService = require("./services/mqtt.service");
const influxService = require("./services/influx.service");
const wsServer = require("./websocket/ws");

const PORT = config.port;
const debugEnabled = String(process.env.DEBUG || "").toLowerCase() === "true";

function debugLog(...args) {
  if (debugEnabled) {
    console.log(...args);
  }
}

async function startServer() {
  influxService.initialize();
  mqttService.connect();

  mqttService.subscribe("sensors/+/telemetry", async (topic, payload, rawMessage) => {
    let data = payload;

    if (!data || typeof data !== "object") {
      try {
        data = JSON.parse(rawMessage);
      } catch (error) {
        debugLog("MQTT telemetry payload invalid JSON:", { topic, error: error.message });
        return;
      }
    }

    const { room, sensor_id, metric, value, ts } = data || {};
    const valueNumber = Number(value);

    if (!room || !sensor_id || !metric || !Number.isFinite(valueNumber)) {
      debugLog("MQTT telemetry payload missing fields:", { topic, data });
      return;
    }

    try {
      influxService.writeTelemetry({
        room,
        sensor_id,
        metric,
        value: valueNumber,
        ts,
      });
      debugLog("Telemetry written to InfluxDB:", { topic, room, sensor_id, metric, value: valueNumber });
    } catch (error) {
      console.error("Failed to write telemetry to InfluxDB:", error);
    }
  });

  app.get("/health", async (req, res) => {
    const mqttStatus = mqttService.isConnected();
    const influxStatus = await influxService.healthCheck();
    const status = mqttStatus && influxStatus ? "healthy" : "degraded";

    res.json({
      status,
      services: {
        mqtt: mqttStatus ? "up" : "down",
        influxdb: influxStatus ? "up" : "down",
      },
    });
  });

  const server = http.createServer(app);
  wsServer.initialize(server);

  server.listen(PORT, () => {
    console.log(`EcoGuard API listening on port ${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
