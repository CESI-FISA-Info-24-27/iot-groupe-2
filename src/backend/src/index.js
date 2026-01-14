const http = require("http");
const app = require("./app");
const config = require("./config/env");
const mqttService = require("./services/mqtt.service");
const influxService = require("./services/influx.service");
const wsServer = require("./websocket/ws");

const PORT = config.port;

async function startServer() {
  influxService.initialize();
  mqttService.connect();

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
