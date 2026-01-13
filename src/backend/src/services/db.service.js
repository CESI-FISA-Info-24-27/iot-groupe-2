const { MongoClient } = require("mongodb");
const config = require("../config/env");

class DbService {
  constructor() {
    this.client = null;
    this.db = null;
  }

  async connect() {
    try {
      this.client = new MongoClient(config.mongodb.uri, config.mongodb.options);
      await this.client.connect();
      this.db = this.client.db();
      console.log("✓ Connected to MongoDB");
    } catch (error) {
      console.error("MongoDB connection error:", error);
      throw error;
    }
  }

  async saveSensorData(topic, data) {
    try {
      const collection = this.db.collection("sensor_data");
      const document = {
        topic,
        data,
        timestamp: new Date(),
      };
      await collection.insertOne(document);
    } catch (error) {
      console.error("Error saving sensor data:", error);
    }
  }

  async getSensorData(filter = {}, limit = 100) {
    try {
      const collection = this.db.collection("sensor_data");
      return await collection
        .find(filter)
        .sort({ timestamp: -1 })
        .limit(limit)
        .toArray();
    } catch (error) {
      console.error("Error getting sensor data:", error);
      return [];
    }
  }

  async getLatestSensorData(sensorId) {
    try {
      const collection = this.db.collection("sensor_data");
      return await collection.findOne(
        { "data.sensorId": sensorId },
        { sort: { timestamp: -1 } }
      );
    } catch (error) {
      console.error("Error getting latest sensor data:", error);
      return null;
    }
  }

  async getSensorDataByTimeRange(startDate, endDate) {
    try {
      const collection = this.db.collection("sensor_data");
      return await collection
        .find({
          timestamp: {
            $gte: new Date(startDate),
            $lte: new Date(endDate),
          },
        })
        .sort({ timestamp: -1 })
        .toArray();
    } catch (error) {
      console.error("Error getting sensor data by time range:", error);
      return [];
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
      console.log("MongoDB connection closed");
    }
  }
}

module.exports = new DbService();
