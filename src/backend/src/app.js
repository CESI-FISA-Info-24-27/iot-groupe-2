const express = require("express");
const cors = require("cors");

function createApp({ sensorsRoutes }) {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get("/", (req, res) => res.json({ name: "EcoGuard API", status: "ok" }));

  // Routes métiers
  app.use("/api/sensors", sensorsRoutes);

  return app;
}

module.exports = { createApp };
