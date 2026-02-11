#!/usr/bin/env python3
"""
CesIOT - Face Detector + MJPEG Restreamer
Receives MJPEG from ESP32-CAM, detects faces via Haar Cascades,
applies a filter and re-serves a processed MJPEG stream.

Fan-out architecture: ONE connection to ESP32-CAM, re-served to N clients.

Endpoints:
  /stream/raw          -> raw stream (no processing)
  /stream/blur         -> face blur (default)
  /stream/none         -> alias for raw
  /stream/quentin      -> overlay "quentin" on faces
  /stream/grayscale    -> B/W
  /stream/edges        -> Canny edges
  /stream/nightvision  -> green boost
  /stream/thermal      -> thermal palette
  /stream/highcontrast -> CLAHE
  /health              -> {"status":"ok"}
  /filters             -> JSON list of filters
"""

import os
import cv2
import time
import threading
import socketserver
import numpy as np
import logging
import requests
from http.server import HTTPServer, BaseHTTPRequestHandler
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

logging.basicConfig(level=logging.WARNING)


class MJPEGStreamHandler(BaseHTTPRequestHandler):
    """Serve MJPEG streams to HTTP clients."""

    def _get_filter(self):
        path = self.path.split("?")[0].rstrip("/")
        if path in ("/stream", ""):
            return "blur"
        for f in FaceDetector.FILTERS:
            if path == f"/stream/{f}":
                return f
        return None

    def _send_mjpeg(self, filt):
        self.send_response(200)
        self.send_header("Content-Type", "multipart/x-mixed-replace; boundary=BoundaryString")
        self.send_header("Cache-Control", "no-cache, no-store")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        last_v = -1
        while self.server.running:
            try:
                data, v = self.server.get_jpeg(filt)
                if data and v != last_v:
                    last_v = v
                    self.wfile.write(b"--BoundaryString\r\nContent-Type: image/jpeg\r\n")
                    self.wfile.write(f"Content-Length: {len(data)}\r\n\r\n".encode())
                    self.wfile.write(data)
                    self.wfile.write(b"\r\n")
                    self.wfile.flush()
                else:
                    time.sleep(0.005)
            except Exception:
                break

    def do_GET(self):
        try:
            filt = self._get_filter()
            if filt is not None:
                return self._send_mjpeg(filt)
            if self.path == "/health":
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(b'{"status":"ok"}')
                return
            if self.path == "/filters":
                import json
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps(FaceDetector.FILTERS).encode())
                return
            self.send_response(404)
            self.end_headers()
        except Exception as e:
            print(f"ERROR: {e}", flush=True)

    def log_message(self, *_):
        pass


class FaceDetector:
    FILTERS = ["raw", "blur", "none", "quentin", "grayscale", "edges", "nightvision", "thermal", "highcontrast"]

    def __init__(self):
        self.esp32_url = os.getenv("ESP32_CAM_URL", "http://172.20.10.13/stream")
        self.http_port = int(os.getenv("HTTP_PORT", "8890"))
        self.skip = int(os.getenv("DETECTION_SKIP", "5"))
        self.w = int(os.getenv("STREAM_WIDTH", "640"))
        self.h = int(os.getenv("STREAM_HEIGHT", "480"))
        self.cascade = None
        self.overlay_quentin = None
        self.frame = None
        self.count = 0
        self.faces = []
        self.server = None

    def load_cascade(self):
        for d in ["/usr/share/opencv/haarcascades/", "/usr/share/opencv4/haarcascades/"]:
            f = os.path.join(d, "haarcascade_frontalface_default.xml")
            if os.path.exists(f):
                self.cascade = cv2.CascadeClassifier(f)
                if not self.cascade.empty():
                    print(f"Cascade loaded: {f}", flush=True)
                    return
        raise RuntimeError("haarcascade_frontalface_default.xml not found")

    def load_assets(self):
        asset_path = os.path.join(os.path.dirname(__file__), "assets", "quentin.png")
        if os.path.exists(asset_path):
            self.overlay_quentin = cv2.imread(asset_path, cv2.IMREAD_UNCHANGED)
            if self.overlay_quentin is None:
                print(f"Failed to load asset: {asset_path}", flush=True)
            else:
                print(f"Asset loaded: {asset_path}", flush=True)
        else:
            print(f"Asset not found: {asset_path}", flush=True)

    def detect(self, frame):
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        h, w = gray.shape
        s = 3
        small = cv2.resize(gray, (w // s, h // s), interpolation=cv2.INTER_LINEAR)
        faces = self.cascade.detectMultiScale(small, scaleFactor=1.3, minNeighbors=2,
                                              minSize=(10, 10), maxSize=(80, 80))
        self.faces = [(int(x*s), int(y*s), int(fw*s), int(fh*s)) for x, y, fw, fh in faces] if len(faces) else []

    def apply_filter(self, frame, name):
        f = frame.copy()
        if name == "quentin":
            if self.overlay_quentin is None:
                return f
            for x, y, w, h in self.faces:
                try:
                    scale = 1.5
                    extra_w = int((w * scale - w) / 2)
                    extra_h = int((h * scale - h) / 2)
                    x0 = max(0, x - extra_w)
                    y0 = max(0, y - extra_h)
                    x1 = min(f.shape[1], x + w + extra_w)
                    y1 = min(f.shape[0], y + h + extra_h)
                    if x1 <= x0 or y1 <= y0:
                        continue
                    roi_w = x1 - x0
                    roi_h = y1 - y0
                    overlay = cv2.resize(self.overlay_quentin, (roi_w, roi_h), interpolation=cv2.INTER_LINEAR)
                    if overlay.shape[2] == 4:
                        alpha = overlay[:, :, 3] / 255.0
                        for c in range(3):
                            f[y0:y1, x0:x1, c] = (
                                alpha * overlay[:, :, c] + (1.0 - alpha) * f[y0:y1, x0:x1, c]
                            )
                    else:
                        f[y0:y1, x0:x1] = overlay[:, :, :3]
                except Exception:
                    pass
            return f
        if name == "blur" or name is None:
            for x, y, w, h in self.faces:
                try:
                    pad = int(max(w, h) * 0.2)
                    x0 = max(0, x - pad)
                    y0 = max(0, y - pad)
                    x1 = min(f.shape[1], x + w + pad)
                    y1 = min(f.shape[0], y + h + pad)
                    roi = f[y0:y1, x0:x1]
                    roi = cv2.GaussianBlur(roi, (51, 51), 30)
                    roi = cv2.GaussianBlur(roi, (51, 51), 30)
                    f[y0:y1, x0:x1] = roi
                except Exception:
                    pass
            return f
        if name in ("none", "raw"):
            return f
        if name == "grayscale":
            return cv2.cvtColor(cv2.cvtColor(f, cv2.COLOR_BGR2GRAY), cv2.COLOR_GRAY2BGR)
        if name == "edges":
            return cv2.cvtColor(cv2.Canny(cv2.cvtColor(f, cv2.COLOR_BGR2GRAY), 50, 150), cv2.COLOR_GRAY2BGR)
        if name == "nightvision":
            g = f.copy()
            g[:, :, 0] = 0
            g[:, :, 2] = 0
            g[:, :, 1] = cv2.add(g[:, :, 1], 40)
            return g
        if name == "thermal":
            return cv2.applyColorMap(cv2.cvtColor(f, cv2.COLOR_BGR2GRAY), cv2.COLORMAP_JET)
        if name == "highcontrast":
            lab = cv2.cvtColor(f, cv2.COLOR_BGR2LAB)
            l, a, b = cv2.split(lab)
            l = cv2.createCLAHE(clipLimit=4.0, tileGridSize=(8, 8)).apply(l)
            return cv2.cvtColor(cv2.merge([l, a, b]), cv2.COLOR_LAB2BGR)
        return f

    def start_server(self):
        det = self

        class Server(socketserver.ThreadingMixIn, HTTPServer):
            daemon_threads = True

            def __init__(self):
                self.detector = det
                self.current_frame = None
                self.ver = 0
                self.cache = {}
                self.lock = threading.Lock()
                self.running = True
                super().__init__(("0.0.0.0", det.http_port), MJPEGStreamHandler)

            def get_jpeg(self, filt):
                v = self.ver
                with self.lock:
                    c = self.cache.get(filt)
                    if c and c[0] == v:
                        return c[1], v
                fr = self.current_frame
                if fr is None:
                    return None, v
                out = self.detector.apply_filter(fr, filt)
                ok, jpg = cv2.imencode(".jpg", out, [cv2.IMWRITE_JPEG_QUALITY, 70])
                if not ok:
                    return None, v
                b = jpg.tobytes()
                with self.lock:
                    self.cache[filt] = (v, b)
                return b, v

        self.server = Server()
        threading.Thread(target=self.server.serve_forever, daemon=True).start()
        print(f"Stream hub on http://0.0.0.0:{self.http_port}", flush=True)
        print("  /stream/raw  -> raw (fan-out)", flush=True)
        print("  /stream/blur -> face blur", flush=True)

    def read_esp32(self):
        sess = requests.Session()
        sess.mount("http://", HTTPAdapter(max_retries=Retry(connect=5, backoff_factor=1)))
        print(f"ESP32: {self.esp32_url}", flush=True)
        resp = sess.get(self.esp32_url, stream=True, timeout=15)
        resp.raise_for_status()
        print("ESP32 stream connected", flush=True)
        buf = bytearray()
        boundary = b"--frame"
        for chunk in resp.iter_content(chunk_size=16384):
            if not chunk:
                break
            buf.extend(chunk)
            while True:
                i = buf.find(boundary)
                if i == -1:
                    if len(buf) > 65536:
                        buf = buf[-16384:]
                    break
                j = buf.find(boundary, i + len(boundary))
                if j == -1:
                    break
                data = buf[i:j]
                soi, eoi = data.find(b"\xff\xd8"), data.find(b"\xff\xd9")
                if soi != -1 and eoi != -1:
                    frame = cv2.imdecode(np.frombuffer(bytes(data[soi:eoi+2]), np.uint8), cv2.IMREAD_COLOR)
                    if frame is not None:
                        frame = cv2.resize(frame, (self.w, self.h), interpolation=cv2.INTER_LINEAR)
                        if self.count % self.skip == 0:
                            self.detect(frame)
                        self.frame = frame
                        self.server.current_frame = frame
                        self.server.ver += 1
                        self.count += 1
                        yield frame
                del buf[:j]

    def run(self):
        print("=" * 50)
        print("  CesIOT - Stream Hub (fan-out)")
        print("  1 ESP32 -> N clients")
        print("=" * 50)
        print(f"Source: {self.esp32_url}")
        print(f"{self.w}x{self.h} | detection 1/{self.skip} frames")
        self.load_cascade()
        self.load_assets()
        self.start_server()
        while True:
            try:
                for _ in self.read_esp32():
                    pass
            except Exception as e:
                print(f"ERROR: {e} -> reconnect in 3s...", flush=True)
                time.sleep(3)


if __name__ == "__main__":
    FaceDetector().run()
