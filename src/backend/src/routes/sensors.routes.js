const express = require("express");
const influxService = require("../services/influx.service");
const mqttService = require("../services/mqtt.service");

const router = express.Router();

// GET /api/sensors/history?sensor=...&room=...&range=24h
router.get("/history", async (req, res) => {
  try {
    const { sensor, room, range } = req.query;
    const data = await influxService.queryHistory({ sensor, room, range });

    res.json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// POST /api/sensors/action { target, payload }
router.post("/action", (req, res) => {
  const { target, payload } = req.body || {};

  if (!target) {
    return res.status(400).json({
      success: false,
      error: "target is required",
    });
  }

  if (!mqttService.isConnected()) {
    return res.status(503).json({
      success: false,
      error: "MQTT service unavailable",
    });
  }

  const topic = `actuators/${target}/cmd`;
  mqttService.publish(topic, payload || {});

  return res.json({
    success: true,
    topic,
  });
});

module.exports = router;
