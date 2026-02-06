from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response, StreamingResponse
import httpx
import os, time, logging
from threading import Lock

router = APIRouter(prefix="/api/camera", tags=["camera"])
logger = logging.getLogger("camera")

DEFAULT_SNAPSHOT_URL = "http://172.20.10.13/capture"
DEFAULT_STREAM_URL = "http://172.20.10.13:81/stream"

# ---------------------------------------------------------------------------
# Stream hub : le face-detector est le SEUL consommateur du flux ESP32.
# Le backend proxy tout à travers lui (flux brut + filtres).
# L'ESP32-CAM ne supporte qu'UN seul client MJPEG simultané.
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
# Proxy MJPEG async avec httpx (comme le groupe 1)
# httpx stream les bytes au fur et à mesure → pas de buffering
# ---------------------------------------------------------------------------

async def _proxy_mjpeg_stream(upstream_url: str, tag: str):
    """
    Générateur async : ouvre une connexion stream vers le hub,
    yield chaque chunk au fur et à mesure.
    """
    logger.warning("[%s] Connecting to: %s", tag, upstream_url)
    timeout = httpx.Timeout(connect=5.0, read=30.0, write=5.0, pool=5.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        async with client.stream("GET", upstream_url) as response:
            logger.warning("[%s] Connected OK status=%s content-type=%s",
                           tag, response.status_code, response.headers.get("content-type"))
            if response.status_code != 200:
                raise httpx.HTTPStatusError(
                    f"Upstream returned {response.status_code}",
                    request=response.request, response=response
                )
            async for chunk in response.aiter_bytes():
                yield chunk


@router.get("/stream")
async def stream(url: str = Query(None)):
    """
    Proxy le flux MJPEG via le stream-hub (fan-out).
    Si ?url= est fourni, on bypass pour test direct.
    """
    upstream_url = url if url else f"{STREAM_HUB_BASE}/stream/raw"
    logger.warning("[CAM-STREAM] url=%s hub=%s", upstream_url, STREAM_HUB_BASE)

    try:
        # Teste que le hub répond avant de lancer le stream
        async with httpx.AsyncClient(timeout=httpx.Timeout(5.0)) as client:
            head = await client.get(f"{STREAM_HUB_BASE}/health")
            logger.warning("[CAM-STREAM] Hub health=%s", head.status_code)
    except Exception as exc:
        logger.error("[CAM-STREAM] Hub unreachable: %s", repr(exc))
        raise HTTPException(status_code=502, detail=f"Stream hub unreachable: {exc}") from exc

    return StreamingResponse(
        _proxy_mjpeg_stream(upstream_url, "CAM-STREAM"),
        media_type="multipart/x-mixed-replace; boundary=BoundaryString",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Connection": "keep-alive",
        },
    )


# ---------------------------------------------------------------------------
# Face-stream : /api/camera/face-stream/{filter_name}
# ---------------------------------------------------------------------------

@router.get("/face-stream/{filter_name}")
async def face_stream(filter_name: str = "blur"):
    """Proxy le flux MJPEG traité par le stream-hub."""
    if filter_name not in AVAILABLE_FILTERS:
        raise HTTPException(status_code=400, detail=f"Filtre inconnu: {filter_name}. Disponibles: {AVAILABLE_FILTERS}")

    upstream_url = f"{STREAM_HUB_BASE}/stream/{filter_name}"
    logger.warning("[CAM-FACE] filter=%s url=%s", filter_name, upstream_url)

    return StreamingResponse(
        _proxy_mjpeg_stream(upstream_url, "CAM-FACE"),
        media_type="multipart/x-mixed-replace; boundary=BoundaryString",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Connection": "keep-alive",
        },
    )


@router.get("/filters")
def list_filters():
    """Liste les filtres disponibles."""
    return {"filters": AVAILABLE_FILTERS}
