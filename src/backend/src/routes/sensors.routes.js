const express = require("express");

function createSensorsRoutes({ dbService, mqttService }) {
  const router = express.Router();

  router.get("/latest", async (req, res) => {
    res.json({ ok: true, message: "TODO latest" });
  });

  return router;
}

module.exports = { createSensorsRoutes };
