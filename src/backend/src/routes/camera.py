from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response, StreamingResponse
import os, time, logging
from threading import Lock
from urllib.request import urlopen, Request
from urllib.error import URLError, HTTPError

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
def snapshot(url: str = Query(DEFAULT_SNAPSHOT_URL)):
    global _last_frame, _last_ts

    logger.info("snapshot requested url=%s", url)
    with _cache_lock:
        if _last_frame is not None and (time.time() - _last_ts) < 0.8:
            logger.info("snapshot cache=hit age=%.3fs", time.time() - _last_ts)
            return Response(content=_last_frame, media_type="image/jpeg", headers={"X-Cache": "hit"})

    headers = {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        "Accept": "image/jpeg,*/*",
        "Cache-Control": "no-cache",
    }

    for _ in range(2):
        try:
            request = Request(url, headers=headers)
            with urlopen(request, timeout=12) as response:
                frame = response.read()
                content_type = response.headers.get("Content-Type", "image/jpeg")
            if not frame:
                raise ValueError("Empty snapshot response")
            with _cache_lock:
                _last_frame = frame
                _last_ts = time.time()
            logger.info("snapshot cache=miss size=%d", len(frame))
            media_type = content_type if content_type.startswith("image/") else "image/jpeg"
            return Response(content=frame, media_type=media_type, headers={"X-Cache": "miss"})
        except (HTTPError, URLError, TimeoutError, ValueError) as exc:
            logger.warning("snapshot upstream error url=%s err=%s", url, repr(exc))
            continue

    with _cache_lock:
        if _last_frame is not None:
            logger.warning("snapshot cache=stale age=%.3fs", time.time() - _last_ts)
            return Response(content=_last_frame, media_type="image/jpeg", headers={"X-Cache": "stale"})

    logger.error("snapshot failed url=%s", url)
    raise HTTPException(status_code=502, detail="Camera snapshot failed")


def _iter_mjpeg_stream(response, chunk_size: int = 4096):
    try:
        while True:
            chunk = response.read(chunk_size)
            if not chunk:
                break
            yield chunk
    finally:
        response.close()


@router.get("/stream")
def stream(url: str = Query(None)):
    """
    Proxy le flux MJPEG via le stream-hub (fan-out).
    Le stream-hub est le seul à se connecter à l'ESP32.
    Si ?url= est fourni, on bypass (test direct ESP32).
    """
    if url:
        upstream_url = url
        logger.info("stream direct url=%s", url)
    else:
        upstream_url = f"{STREAM_HUB_BASE}/stream/raw"
        logger.info("stream via hub url=%s", upstream_url)
    headers = {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        "Accept": "multipart/x-mixed-replace,image/jpeg,*/*",
    }

    try:
        request = Request(upstream_url, headers=headers)
        response = urlopen(request, timeout=8)
    except (HTTPError, URLError, TimeoutError) as exc:
        logger.exception("stream upstream error url=%s", upstream_url)
        raise HTTPException(status_code=502, detail="Camera stream failed") from exc

    content_type = response.headers.get(
        "Content-Type", "multipart/x-mixed-replace"
    )
    logger.info("stream upstream content-type=%s", content_type)

    return StreamingResponse(
        _iter_mjpeg_stream(response),
        media_type=content_type,
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
        },
    )


# ---------------------------------------------------------------------------
# Face-stream : /api/camera/face-stream/{filter_name}
# Passe par le même stream-hub, juste un filtre différent.
# ---------------------------------------------------------------------------

@router.get("/face-stream/{filter_name}")
def face_stream(filter_name: str = "blur"):
    """Proxy le flux MJPEG traité par le stream-hub."""
    if filter_name not in AVAILABLE_FILTERS:
        raise HTTPException(status_code=400, detail=f"Filtre inconnu: {filter_name}. Disponibles: {AVAILABLE_FILTERS}")

    upstream_url = f"{STREAM_HUB_BASE}/stream/{filter_name}"
    logger.info("face-stream filter=%s url=%s", filter_name, upstream_url)

    headers = {
        "User-Agent": "CesIOT-Backend/1.0",
        "Accept": "multipart/x-mixed-replace,image/jpeg,*/*",
    }

    try:
        request = Request(upstream_url, headers=headers)
        response = urlopen(request, timeout=10)
    except (HTTPError, URLError, TimeoutError) as exc:
        logger.exception("face-stream upstream error filter=%s", filter_name)
        raise HTTPException(status_code=502, detail="Stream hub unavailable") from exc

    content_type = response.headers.get("Content-Type", "multipart/x-mixed-replace")

    return StreamingResponse(
        _iter_mjpeg_stream(response),
        media_type=content_type,
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
        },
    )


@router.get("/filters")
def list_filters():
    """Liste les filtres face-detector disponibles."""
    return {"filters": AVAILABLE_FILTERS}
