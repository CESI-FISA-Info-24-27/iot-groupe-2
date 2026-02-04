from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import json
from typing import Dict, Any

from config.env import settings
from services.mqtt_service import mqtt_service
from services.influx_service import influx_service
from routes.sensors import router as sensors_router
from routes.camera import router as camera_router
from websocket.ws import ws_manager

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    # Startup
    print("🚀 Starting CesIOT API...")
    
    # Initialize services
    influx_service.initialize()
    mqtt_service.connect()
    ws_manager.initialize()

    # Subscribe to telemetry and write to InfluxDB
    def handle_telemetry(topic: str, payload: Dict[str, Any], raw_message: str):
        data = payload
        
        if not data or not isinstance(data, dict):
            try:
                data = json.loads(raw_message)
            except json.JSONDecodeError as e:
                if settings.debug:
                    print(f"MQTT telemetry payload invalid JSON: {topic}, {e}")
                return

        room = data.get("room")
        sensor_id = data.get("sensor_id")
        metric = data.get("metric")
        value = data.get("value")
        ts = data.get("ts")

        try:
            value_number = float(value)
        except (TypeError, ValueError):
            if settings.debug:
                print(f"Invalid value in telemetry: {value}")
            return

        if not all([room, sensor_id, metric]) or value is None:
            if settings.debug:
                print(f"MQTT telemetry payload missing fields: {topic}, {data}")
            return

        try:
            influx_service.write_telemetry(
                room=room,
                sensor_id=sensor_id,
                metric=metric,
                value=value_number,
                ts=ts
            )
            if settings.debug:
                print(f"Telemetry written to InfluxDB: {topic}, {room}, {sensor_id}, {metric}, {value_number}")
        except Exception as e:
            print(f"Failed to write telemetry to InfluxDB: {e}")

    def handle_ecoguard(topic: str, payload: Dict[str, Any], raw_message: str):
        data = payload

        if not data or not isinstance(data, dict):
            try:
                data = json.loads(raw_message)
            except json.JSONDecodeError as e:
                if settings.debug:
                    print(f"MQTT ecoguard payload invalid JSON: {topic}, {e}")
                return

        room = data.get("room_id") or data.get("room")
        sensor_id = data.get("device_id") or data.get("sensor_id") or data.get("parent_device_id")
        metric = data.get("sensor_type") or data.get("metric")
        value = data.get("value", data.get("amplitude"))
        ts = data.get("timestamp") or data.get("ts")

        if not all([room, sensor_id, metric]) or value is None:
            if settings.debug:
                print(f"MQTT ecoguard payload missing fields: {topic}, {data}")
            return

        try:
            value_number = float(value)
        except (TypeError, ValueError):
            if settings.debug:
                print(f"Invalid value in ecoguard payload: {value}")
            return

        try:
            influx_service.write_telemetry(
                room=room,
                sensor_id=sensor_id,
                metric=metric,
                value=value_number,
                ts=ts
            )
            if settings.debug:
                print(f"Ecoguard telemetry written to InfluxDB: {topic}, {room}, {sensor_id}, {metric}, {value_number}")
        except Exception as e:
            print(f"Failed to write ecoguard telemetry to InfluxDB: {e}")

    source = (settings.mqtt_telemetry_source or "telemetry").lower()
    if source in {"telemetry", "both"}:
        mqtt_service.subscribe("sensors/+/telemetry", handle_telemetry)
    if source in {"ecoguard", "both"}:
        mqtt_service.subscribe("ecoguard/sensors/+/+", handle_ecoguard)
    
    print(f"✓ CesIOT API listening on port {settings.port}")
    
    yield
    
    # Shutdown
    print("Shutting down...")
    mqtt_service.disconnect()
    influx_service.close()


app = FastAPI(
    title="CesIOT API",
    description="IoT Backend API with MQTT and WebSocket support",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.cors_origin] if settings.cors_origin != "*" else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "🚀 CesIOT API is running!"}


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    mqtt_status = mqtt_service.is_connected()
    influx_status = await influx_service.health_check()
    status = "healthy" if (mqtt_status and influx_status) else "degraded"

    return {
        "status": status,
        "services": {
            "mqtt": "up" if mqtt_status else "down",
            "influxdb": "up" if influx_status else "down",
        }
    }


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time sensor data"""
    await ws_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                await ws_manager.handle_message(websocket, message)
            except json.JSONDecodeError:
                await websocket.send_json({
                    "type": "error",
                    "message": "Invalid JSON"
                })
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)


# Include routers
app.include_router(sensors_router)
app.include_router(camera_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.port,
        reload=settings.env == "development"
    )
