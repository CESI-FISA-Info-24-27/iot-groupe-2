const mqtt = require("mqtt");
const config = require("../config/env");
const dbService = require("./db.service");

class MqttService {
  constructor() {
    this.client = null;
    this.callbacks = [];
  }

  connect() {
    const options = {
      username: config.mqtt.username,
      password: config.mqtt.password,
      reconnectPeriod: 5000,
    };

    this.client = mqtt.connect(config.mqtt.broker, options);

    this.client.on("connect", () => {
      console.log("✓ Connected to MQTT broker");
      this.subscribe(config.mqtt.topics.sensors);
      this.subscribe(config.mqtt.topics.camera);
    });

    this.client.on("message", async (topic, message) => {
      try {
        const payload = JSON.parse(message.toString());
        console.log(`MQTT message on ${topic}:`, payload);

        // Save to database
        await dbService.saveSensorData(topic, payload);

        // Notify all registered callbacks
        this.callbacks.forEach((callback) => callback(topic, payload));
      } catch (error) {
        console.error("Error processing MQTT message:", error);
      }
    });

    this.client.on("error", (error) => {
      console.error("MQTT error:", error);
    });

    this.client.on("offline", () => {
      console.log("MQTT client offline");
    });

    this.client.on("reconnect", () => {
      console.log("Reconnecting to MQTT broker...");
    });
  }

  subscribe(topic) {
    if (this.client && this.client.connected) {
      this.client.subscribe(topic, (err) => {
        if (err) {
          console.error(`Failed to subscribe to ${topic}:`, err);
        } else {
          console.log(`✓ Subscribed to ${topic}`);
        }
      });
    }
  }

  publish(topic, message) {
    if (this.client && this.client.connected) {
      this.client.publish(topic, JSON.stringify(message));
    }
  }

  onMessage(callback) {
    this.callbacks.push(callback);
  }

  disconnect() {
    if (this.client) {
      this.client.end();
    }
  }
}

module.exports = new MqttService();
