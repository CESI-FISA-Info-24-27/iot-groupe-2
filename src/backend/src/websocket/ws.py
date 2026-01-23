from fastapi import WebSocket, WebSocketDisconnect
from typing import Set, Dict, Any
import json
from datetime import datetime
from app.services.mqtt_service import mqtt_service


class WebSocketManager:
    def __init__(self):
        self.clients: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        """Accept new WebSocket connection"""
        await websocket.accept()
        self.clients.add(websocket)
        print(f"✓ New WebSocket client connected (total: {len(self.clients)})")

        # Send welcome message
        await websocket.send_json({
            "type": "connection",
            "message": "Connected to IoT Backend WebSocket",
            "timestamp": datetime.now().isoformat()
        })

    def disconnect(self, websocket: WebSocket):
        """Remove WebSocket connection"""
        self.clients.discard(websocket)
        print(f"WebSocket client disconnected (remaining: {len(self.clients)})")

    async def handle_message(self, websocket: WebSocket, data: Dict[str, Any]):
        """Handle incoming WebSocket messages"""
        msg_type = data.get("type")

        if msg_type == "ping":
            await websocket.send_json({
                "type": "pong",
                "timestamp": datetime.now().isoformat()
            })
        elif msg_type == "subscribe":
            await websocket.send_json({
                "type": "subscribed",
                "topic": data.get("topic"),
                "timestamp": datetime.now().isoformat()
            })
        else:
            await websocket.send_json({
                "type": "error",
                "message": "Unknown message type",
                "timestamp": datetime.now().isoformat()
            })

    async def broadcast(self, data: Dict[str, Any]):
        """Broadcast message to all connected clients"""
        message = json.dumps(data)
        disconnected = set()

        for client in self.clients:
            try:
                await client.send_text(message)
            except Exception as e:
                print(f"Error sending to client: {e}")
                disconnected.add(client)

        # Remove disconnected clients
        for client in disconnected:
            self.clients.discard(client)

    def initialize(self):
        """Initialize WebSocket manager and MQTT forwarding"""
        # Forward MQTT messages to all WebSocket clients
        def mqtt_to_ws(topic: str, payload: Dict[str, Any]):
            import asyncio
            asyncio.create_task(self.broadcast({
                "type": "sensor_data",
                "topic": topic,
                "data": payload,
                "timestamp": datetime.now().isoformat()
            }))

        mqtt_service.on_message(mqtt_to_ws)
        print("✓ WebSocket manager initialized")


# Singleton instance
ws_manager = WebSocketManager()