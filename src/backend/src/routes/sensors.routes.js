const express = require("express");
const router = express.Router();
const dbService = require("../services/db.service");

// Get all sensor data
router.get("/", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const data = await dbService.getSensorData({}, limit);
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

// Get latest data for a specific sensor
router.get("/:sensorId/latest", async (req, res) => {
  try {
    const { sensorId } = req.params;
    const data = await dbService.getLatestSensorData(sensorId);

    if (!data) {
      return res.status(404).json({
        success: false,
        error: "Sensor not found",
      });
    }

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get sensor data by time range
router.get("/range", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: "startDate and endDate are required",
      });
    }

    const data = await dbService.getSensorDataByTimeRange(startDate, endDate);
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

// Get sensor data by sensor ID
router.get("/:sensorId", async (req, res) => {
  try {
    const { sensorId } = req.params;
    const limit = parseInt(req.query.limit) || 100;
    const data = await dbService.getSensorData(
      { "data.sensorId": sensorId },
      limit
    );

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

module.exports = router;
