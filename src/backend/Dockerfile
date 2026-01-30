FROM python:3.10-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY /src/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY src/ /app/src/

WORKDIR /app/src

EXPOSE ${PORT}

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT}"]
