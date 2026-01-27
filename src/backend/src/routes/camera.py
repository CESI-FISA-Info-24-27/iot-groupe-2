from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response
import time
from threading import Lock
from urllib.request import urlopen, Request
from urllib.error import URLError, HTTPError

router = APIRouter(prefix="/api/camera", tags=["camera"])

DEFAULT_MJPEG_URL = "http://honjin1.miemasu.net/nphMotionJpeg?Resolution=640x480&Quality=Standard"
_cache_lock = Lock()
_last_frame = None
_last_ts = 0.0


def _read_mjpeg_frame(stream, max_bytes: int = 2_000_000) -> bytes:
    start = b"\xff\xd8"
    end = b"\xff\xd9"
    data = b""
    while len(data) < max_bytes:
        chunk = stream.read(4096)
        if not chunk:
            break
        data += chunk
        start_idx = data.find(start)
        if start_idx != -1:
            end_idx = data.find(end, start_idx + 2)
            if end_idx != -1:
                return data[start_idx : end_idx + 2]
    raise ValueError("No JPEG frame found")


@router.get("/snapshot")
def snapshot(url: str = Query(DEFAULT_MJPEG_URL)):
    global _last_frame, _last_ts

    with _cache_lock:
        if _last_frame is not None and (time.time() - _last_ts) < 0.8:
            return Response(content=_last_frame, media_type="image/jpeg", headers={"X-Cache": "hit"})

    headers = {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        "Accept": "multipart/x-mixed-replace,image/jpeg,*/*",
    }

    for _ in range(2):
        try:
            request = Request(url, headers=headers)
            with urlopen(request, timeout=8) as response:
                frame = _read_mjpeg_frame(response)
            with _cache_lock:
                _last_frame = frame
                _last_ts = time.time()
            return Response(content=frame, media_type="image/jpeg", headers={"X-Cache": "miss"})
        except (HTTPError, URLError, TimeoutError, ValueError):
            continue

    with _cache_lock:
        if _last_frame is not None:
            return Response(content=_last_frame, media_type="image/jpeg", headers={"X-Cache": "stale"})

    raise HTTPException(status_code=502, detail="Camera snapshot failed")
