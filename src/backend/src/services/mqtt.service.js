const mqtt = require("mqtt");
const config = require("../config/env");

class MqttService {
  constructor() {
    this.client = null;
    this.callbacks = [];
    this.subscriptions = [];
  }

  connect() {
    const options = {
      username: config.mqtt.username,
      password: config.mqtt.password,
      reconnectPeriod: 5000,
    };

    const brokerUrl = `mqtt://${config.mqtt.host}:${config.mqtt.port}`;
    this.client = mqtt.connect(brokerUrl, options);

    this.client.on("connect", () => {
      console.log("✓ Connected to MQTT broker");
      this.subscriptions.forEach(({ filter }) => {
        this.client.subscribe(filter, (err) => {
          if (err) {
            console.error(`Failed to subscribe to ${filter}:`, err);
          } else {
            console.log(`✓ Subscribed to ${filter}`);
          }
        });
      });
    });

    this.client.on("message", async (topic, message) => {
      const rawMessage = message.toString();
      let payload = null;

      try {
        payload = JSON.parse(rawMessage);
        console.log(`MQTT message on ${topic}:`, payload);
      } catch (error) {
        console.error("Error processing MQTT message:", error);
      }

      // Notify all registered callbacks
      this.callbacks.forEach((callback) => callback(topic, payload));

      // Notify matching topic handlers with raw message access
      this.subscriptions.forEach(({ filter, handler }) => {
        if (this.matchesTopic(filter, topic)) {
          handler(topic, payload, rawMessage);
        }
      });
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

  subscribe(filter, handler) {
    if (handler) {
      this.subscriptions.push({ filter, handler });
    } else {
      this.subscriptions.push({ filter, handler: () => {} });
    }

    if (this.client && this.client.connected) {
      this.client.subscribe(filter, (err) => {
        if (err) {
          console.error(`Failed to subscribe to ${filter}:`, err);
        } else {
          console.log(`✓ Subscribed to ${filter}`);
        }
      });
    }
  }

  subscribeTelemetry(handler) {
    this.subscribe("sensors/+/telemetry", handler);
  }

  publish(topic, payload, options = { qos: 1 }) {
    if (this.client && this.client.connected) {
      this.client.publish(topic, JSON.stringify(payload), options);
    }
  }

  onMessage(callback) {
    this.callbacks.push(callback);
  }

  isConnected() {
    return Boolean(this.client && this.client.connected);
  }

  disconnect() {
    if (this.client) {
      this.client.end();
    }
  }

  matchesTopic(filter, topic) {
    const filterLevels = filter.split("/");
    const topicLevels = topic.split("/");

    for (let i = 0; i < filterLevels.length; i += 1) {
      const filterLevel = filterLevels[i];
      const topicLevel = topicLevels[i];

      if (filterLevel === "#") {
        return true;
      }

      if (topicLevel === undefined) {
        return false;
      }

      if (filterLevel === "+") {
        continue;
      }

      if (filterLevel !== topicLevel) {
        return false;
      }
    }

    return filterLevels.length === topicLevels.length;
  }
}

module.exports = new MqttService();
