from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response, StreamingResponse
import time
import logging
from threading import Lock
from urllib.request import urlopen, Request
from urllib.error import URLError, HTTPError

router = APIRouter(prefix="/api/camera", tags=["camera"])
logger = logging.getLogger("camera")

DEFAULT_SNAPSHOT_URL = "http://172.20.10.3/snapshot"
DEFAULT_STREAM_URL = "http://172.20.10.3/stream"
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
def stream(url: str = Query(DEFAULT_STREAM_URL)):
    logger.info("stream requested url=%s", url)
    headers = {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        "Accept": "multipart/x-mixed-replace,image/jpeg,*/*",
    }

    try:
        request = Request(url, headers=headers)
        response = urlopen(request, timeout=8)
    except (HTTPError, URLError, TimeoutError) as exc:
        logger.exception("stream upstream error url=%s", url)
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
