FROM python:3.12-slim

WORKDIR /app

# On installe les dépendances système pour BLE
RUN apt-get update && apt-get install -y \
    bluetooth \
    bluez \
    dbus \
    libdbus-1-dev \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Création d'un utilisateur dédié 'iotuser' et attribution des droits sur /dev
RUN useradd -m iotuser \
    && chown -R iotuser:iotuser /dev

# On copie et installe les dépendances Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# On copie le code de l'application
COPY app/ app/
COPY config/ config/

# On lance la commande par défaut en tant que 'iotuser'
USER iotuser
CMD ["python", "app/main.py"]