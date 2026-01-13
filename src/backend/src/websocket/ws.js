const WebSocket = require("ws");
const mqttService = require("../services/mqtt.service");
const config = require("../config/env");

class WebSocketServer {
  constructor() {
    this.wss = null;
    this.clients = new Set();
  }

  initialize(server) {
    this.wss = new WebSocket.Server({ server });

    this.wss.on("connection", (ws) => {
      console.log("✓ New WebSocket client connected");
      this.clients.add(ws);

      ws.on("message", (message) => {
        try {
          const data = JSON.parse(message);
          console.log("WebSocket message received:", data);

          // Handle client requests
          this.handleClientMessage(ws, data);
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      });

      ws.on("close", () => {
        console.log("WebSocket client disconnected");
        this.clients.delete(ws);
      });

      ws.on("error", (error) => {
        console.error("WebSocket error:", error);
        this.clients.delete(ws);
      });

      // Send welcome message
      ws.send(
        JSON.stringify({
          type: "connection",
          message: "Connected to IoT Backend WebSocket",
          timestamp: new Date().toISOString(),
        })
      );
    });

    // Forward MQTT messages to all WebSocket clients
    mqttService.onMessage((topic, payload) => {
      this.broadcast({
        type: "sensor_data",
        topic,
        data: payload,
        timestamp: new Date().toISOString(),
      });
    });

    console.log(`✓ WebSocket server initialized`);
  }

  handleClientMessage(ws, data) {
    switch (data.type) {
      case "ping":
        ws.send(
          JSON.stringify({ type: "pong", timestamp: new Date().toISOString() })
        );
        break;
      case "subscribe":
        // Handle subscription requests
        ws.send(
          JSON.stringify({
            type: "subscribed",
            topic: data.topic,
            timestamp: new Date().toISOString(),
          })
        );
        break;
      default:
        ws.send(
          JSON.stringify({
            type: "error",
            message: "Unknown message type",
            timestamp: new Date().toISOString(),
          })
        );
    }
  }

  broadcast(data) {
    const message = JSON.stringify(data);
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  close() {
    if (this.wss) {
      this.wss.close();
      console.log("WebSocket server closed");
    }
  }
}

module.exports = new WebSocketServer();
