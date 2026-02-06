FROM debian:bookworm-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        python3 python3-opencv python3-requests python3-numpy python3-urllib3 curl && \
    mkdir -p /usr/share/opencv/haarcascades && \
    curl -L https://raw.githubusercontent.com/opencv/opencv/master/data/haarcascades/haarcascade_frontalface_default.xml \
         -o /usr/share/opencv/haarcascades/haarcascade_frontalface_default.xml && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY face_detector.py .

EXPOSE 8890

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD curl -f http://localhost:8890/health || exit 1

CMD ["python3", "/app/face_detector.py"]
