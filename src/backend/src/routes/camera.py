from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response, StreamingResponse
import httpx
import os
import time
import logging
from threading import Lock

router = APIRouter(prefix="/api/camera", tags=["camera"])
logger = logging.getLogger("camera")

DEFAULT_SNAPSHOT_URL = "http://172.20.10.13/capture"
DEFAULT_STREAM_URL = "http://172.20.10.13:81/stream"

# ---------------------------------------------------------------------------
# Stream hub: face-detector is the ONLY consumer of the ESP32 stream.
# Backend proxies everything through it (raw + filters).
# ---------------------------------------------------------------------------
STREAM_HUB_BASE = os.environ.get("STREAM_HUB_URL", "http://face-detector:8890")
AVAILABLE_FILTERS = ["raw", "blur", "none", "grayscale", "edges", "nightvision", "thermal", "highcontrast"]

_cache_lock = Lock()
_last_frame = None
_last_ts = 0.0


@router.head("/snapshot")
def snapshot_head():
    with _cache_lock:
        if _last_frame is not None and (time.time() - _last_ts) < 2.0:
            return Response(status_code=200, headers={"X-Cache": "hit"})
    return Response(status_code=204, headers={"X-Cache": "miss"})


@router.get("/snapshot")
async def snapshot(url: str = Query(DEFAULT_SNAPSHOT_URL)):
    global _last_frame, _last_ts

    logger.info("snapshot requested url=%s", url)
    with _cache_lock:
        if _last_frame is not None and (time.time() - _last_ts) < 0.8:
            return Response(content=_last_frame, media_type="image/jpeg", headers={"X-Cache": "hit"})

    for _ in range(2):
        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(12.0)) as client:
                resp = await client.get(url)
                resp.raise_for_status()
                frame = resp.content
                content_type = resp.headers.get("content-type", "image/jpeg")
            if not frame:
                raise ValueError("Empty snapshot response")
            with _cache_lock:
                _last_frame = frame
                _last_ts = time.time()
            logger.info("snapshot cache=miss size=%d", len(frame))
            media_type = content_type if content_type.startswith("image/") else "image/jpeg"
            return Response(content=frame, media_type=media_type, headers={"X-Cache": "miss"})
        except (httpx.HTTPError, ValueError) as exc:
            logger.warning("snapshot upstream error url=%s err=%s", url, repr(exc))
            continue

    with _cache_lock:
        if _last_frame is not None:
            return Response(content=_last_frame, media_type="image/jpeg", headers={"X-Cache": "stale"})

    raise HTTPException(status_code=502, detail="Camera snapshot failed")


# ---------------------------------------------------------------------------
# MJPEG proxy (hub)
# ---------------------------------------------------------------------------

async def _open_upstream_stream(upstream_url: str, tag: str):
    """
    Open streaming connection to hub.
    Returns (client, upstream_response, content_type).
    Caller must close client and response.
    """
    logger.warning("[%s] Connecting to: %s", tag, upstream_url)
    client = httpx.AsyncClient(
        timeout=None,
        headers={"Accept": "multipart/x-mixed-replace"},
    )
    try:
        upstream = await client.send(
            client.build_request("GET", upstream_url),
            stream=True,
        )
        if upstream.status_code != 200:
            await upstream.aclose()
            await client.aclose()
            logger.error("[%s] Upstream returned %s", tag, upstream.status_code)
            raise HTTPException(status_code=502, detail=f"Upstream returned {upstream.status_code}")
    except httpx.ConnectError as exc:
        await client.aclose()
        logger.error("[%s] Connect error: %s", tag, repr(exc))
        raise HTTPException(status_code=503, detail=f"Stream hub unreachable: {exc}") from exc

    content_type = upstream.headers.get(
        "content-type",
        "multipart/x-mixed-replace; boundary=BoundaryString",
    )
    logger.warning("[%s] Connected OK content-type=%s", tag, content_type)
    return client, upstream, content_type


@router.get("/stream")
async def stream(url: str = Query(None)):
    """
    Proxy MJPEG stream via hub (fan-out).
    If ?url= is provided, bypass for direct test.
    """
    upstream_url = url if url else f"{STREAM_HUB_BASE}/stream/raw"
    logger.warning("[CAM-STREAM] url=%s", upstream_url)

    client, upstream, content_type = await _open_upstream_stream(upstream_url, "CAM-STREAM")

    async def relay():
        try:
            async for chunk in upstream.aiter_bytes(chunk_size=4096):
                yield chunk
        except httpx.ReadTimeout:
            logger.error("[CAM-STREAM] Read timeout")
        except Exception as e:
            logger.error("[CAM-STREAM] Error: %s", e)
        finally:
            await upstream.aclose()
            await client.aclose()
            logger.warning("[CAM-STREAM] Stream closed")

    return StreamingResponse(
        relay(),
        media_type=None,
        headers={
            "Content-Type": content_type,
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ---------------------------------------------------------------------------
# Face-stream: /api/camera/face-stream/{filter_name}
# ---------------------------------------------------------------------------

@router.get("/face-stream/{filter_name}")
async def face_stream(filter_name: str = "blur"):
    """Proxy MJPEG processed stream from hub."""
    if filter_name not in AVAILABLE_FILTERS:
        raise HTTPException(
            status_code=400,
            detail=f"Filtre inconnu: {filter_name}. Disponibles: {AVAILABLE_FILTERS}",
        )

    upstream_url = f"{STREAM_HUB_BASE}/stream/{filter_name}"
    logger.warning("[CAM-FACE] filter=%s url=%s", filter_name, upstream_url)

    client, upstream, content_type = await _open_upstream_stream(upstream_url, "CAM-FACE")

    async def relay():
        try:
            async for chunk in upstream.aiter_bytes(chunk_size=4096):
                yield chunk
        except httpx.ReadTimeout:
            logger.error("[CAM-FACE] Read timeout filter=%s", filter_name)
        except Exception as e:
            logger.error("[CAM-FACE] Error: %s", e)
        finally:
            await upstream.aclose()
            await client.aclose()
            logger.warning("[CAM-FACE] Stream closed filter=%s", filter_name)

    return StreamingResponse(
        relay(),
        media_type=None,
        headers={
            "Content-Type": content_type,
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/filters")
def list_filters():
    """List available filters."""
    return {"filters": AVAILABLE_FILTERS}
