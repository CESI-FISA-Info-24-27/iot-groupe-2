from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import time
import random
from services.influx_service import influx_service
from services.mqtt_service import mqtt_service

router = APIRouter(prefix="/api/sensors", tags=["sensors"])

_mock_store: List[Dict[str, Any]] = []


class ActionRequest(BaseModel):
    target: str
    payload: Optional[Dict[str, Any]] = None


class HistoryResponse(BaseModel):
    success: bool
    count: int
    data: list


class ActionResponse(BaseModel):
    success: bool
    topic: str


class ErrorResponse(BaseModel):
    success: bool
    error: str


class MockPayload(BaseModel):
    room: Optional[str] = "lab"
    sensor_id: Optional[str] = "mock-node"
    temperature: Optional[float] = None
    pressure: Optional[float] = None
    distance: Optional[float] = None
    sound: Optional[float] = None


@router.get("/history", response_model=HistoryResponse)
async def get_history(
    sensor: Optional[str] = Query(None),
    room: Optional[str] = Query(None),
    range: str = Query("24h", alias="range")
):
    """
    Get historical sensor data from InfluxDB
    
    - **sensor**: Filter by sensor name (optional)
    - **room**: Filter by room name (optional)
    - **range**: Time range (e.g., 24h, 7d, 1w) (default: 24h)
    """
    try:
        data = await influx_service.query_history(
            sensor=sensor,
            room=room,
            range_time=range
        )
        if data:
            return HistoryResponse(
                success=True,
                count=len(data),
                data=data
            )
    except Exception:
        data = []

    # Fallback to mock data when InfluxDB is not available or empty
    filtered = _mock_store
    if room:
        filtered = [item for item in filtered if item.get("room") == room]
    if sensor:
        filtered = [item for item in filtered if item.get("metric") == sensor]

    if filtered:
        return HistoryResponse(
            success=True,
            count=len(filtered),
            data=filtered
        )

    # If no data at all, return a single mock snapshot
    ts = int(time.time() * 1000)
    room_value = room or "lab"
    sensor_value = "mock-node"
    snapshot = [
        {"time": ts, "room": room_value, "sensor_id": sensor_value, "metric": "temperature", "value": round(random.uniform(18, 28), 2)},
        {"time": ts, "room": room_value, "sensor_id": sensor_value, "metric": "pressure", "value": round(random.uniform(980, 1030), 2)},
        {"time": ts, "room": room_value, "sensor_id": sensor_value, "metric": "distance", "value": round(random.uniform(20, 200), 2)},
        {"time": ts, "room": room_value, "sensor_id": sensor_value, "metric": "sound", "value": round(random.uniform(30, 85), 2)},
    ]

    if sensor:
        snapshot = [item for item in snapshot if item["metric"] == sensor]

    return HistoryResponse(
        success=True,
        count=len(snapshot),
        data=snapshot
    )


@router.post("/action", response_model=ActionResponse)
async def send_action(action: ActionRequest):
    """
    Send action command to actuator via MQTT
    
    - **target**: Target actuator identifier
    - **payload**: Command payload (optional)
    """
    if not action.target:
        raise HTTPException(
            status_code=400,
            detail="target is required"
        )

    if not mqtt_service.is_connected():
        raise HTTPException(
            status_code=503,
            detail="MQTT service unavailable"
        )

    topic = f"actuators/{action.target}/cmd"
    mqtt_service.publish(topic, action.payload or {})

    return ActionResponse(
        success=True,
        topic=topic
    )


@router.post("/mock")
async def push_mock_payload(payload: MockPayload):
    """
    Push mock telemetry data (JSON payload) for quick testing.
    """
    ts = int(time.time() * 1000)
    room = payload.room or "lab"
    sensor_id = payload.sensor_id or "mock-node"

    samples = {
        "temperature": payload.temperature,
        "pressure": payload.pressure,
        "distance": payload.distance,
        "sound": payload.sound,
    }

    for metric, value in samples.items():
        if value is None:
            continue
        entry = {
            "time": ts,
            "room": room,
            "sensor_id": sensor_id,
            "metric": metric,
            "value": float(value),
        }
        _mock_store.append(entry)
        _mock_latest[metric] = float(value)

    if len(_mock_store) > 500:
        del _mock_store[: len(_mock_store) - 500]

    return {
        "success": True,
        "room": room,
        "sensor_id": sensor_id,
        "timestamp": ts,
        "data": {k: v for k, v in samples.items() if v is not None},
    }
