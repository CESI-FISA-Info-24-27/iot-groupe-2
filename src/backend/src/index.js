const http = require("http");
require("dotenv").config();

const { createApp } = require("./app");
const { createMqttService } = require("./services/mqtt.service");
const { createDbService } = require("./services/db.service");
const { setupWebSocket } = require("./websocket/ws");

// Routes
const { createSensorsRoutes } = require("./routes/sensors.routes");

const PORT = parseInt(process.env.PORT || "8000", 10);

async function main() {
  // Init services
  const mqttService = createMqttService();
  mqttService.connect();

  const dbService = createDbService();
  await dbService.connect();

  // Routes (tu peux injecter services dedans)
  const sensorsRoutes = createSensorsRoutes({ dbService, mqttService });

  const app = createApp({ sensorsRoutes });

  // Health check plus riche
  app.get("/health", async (req, res) => {
    res.json({
      status: "healthy",
      timestamp: Date.now(),
      services: {
        mqtt: mqttService.isConnected() ? "up" : "down",
        db: dbService.isConnected() ? "up" : "down",
      },
    });
  });

  const server = http.createServer(app);

  // WS
  setupWebSocket(server);

  server.listen(PORT, () => {
    console.log(`EcoGuard API listening on port ${PORT}`);
  });
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
