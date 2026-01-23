from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, Dict, Any
from app.services.influx_service import influx_service
from app.services.mqtt_service import mqtt_service

router = APIRouter(prefix="/api/sensors", tags=["sensors"])


class ActionRequest(BaseModel):
    target: str
    payload: Optional[Dict[str, Any]] = {}


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
        
        return HistoryResponse(
            success=True,
            count=len(data),
            data=data
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
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