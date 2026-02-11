# CesIOT - Systeme de surveillance hybride Edge IoT

Projet realise dans le cadre du module **IoT - FISA A4 Informatique**.

CesIOT est un MVP de systeme de surveillance industriel hybride combinant securite physique (video) et efficacite energetique (telemetrie), base sur une architecture Edge open source et locale.

---

## Objectifs du projet

- Assurer une surveillance video locale (levee de doute en cas d'intrusion)
- Collecter des donnees environnementales basse consommation
- Mettre en place des automatismes intelligents
- Garder la maitrise des donnees (LAN local, sans cloud)

---

## Architecture globale

### Vue d'ensemble des flux

1. Les capteurs ESP32 publient les mesures (temperature, pression, son, distance) via Wi-Fi/BLE vers le **bridge gateway**.
2. Le **bridge** normalise et publie les messages sur le **broker MQTT (Mosquitto)**.
3. Le **backend API (FastAPI)** s'abonne aux topics MQTT, valide/transforme les payloads, puis ecrit dans **InfluxDB**.
4. Le **front mobile (React Native / Expo)** recupere les donnees depuis l'API (REST + WebSocket).
5. La **camera ESP32-CAM** envoie son flux au service **face-detector** (stream hub), puis le backend proxy les flux camera vers le front.

### Chemin camera

- ESP32-CAM -> `face-detector` (hub MJPEG + filtres visage)
- `face-detector` -> `api` (`/api/camera/stream`, `/api/camera/face-stream/{filter}`)
- `api` -> front mobile

### Chemin telemetrie

- Capteurs -> `gateway`
- `gateway` -> `mqtt-broker`
- `api` (abonne MQTT) -> `influxdb`
- Front -> `api/sensors/latest` et `api/sensors/history`

---

## Explication du `docker-compose.yaml`

Le fichier `src/docker-compose.yaml` orchestre 5 services:

1. `api`
- Role: backend FastAPI (REST, WebSocket, proxy camera, ingestion MQTT)
- Dependances: `mqtt-broker`, `influxdb`, `face-detector`
- Port expose: `${BACKEND_ORIGIN_PORT}:${BACKEND_DEST_PORT}`

2. `mqtt-broker`
- Role: broker Mosquitto pour la telemetrie et les commandes
- Volumes: `./mqtt-broker/config`, `./mqtt-broker/data`, `./mqtt-broker/log`
- Port expose: `${MQTT_BROKER_ORIGIN_PORT}:${MQTT_BROKER_DEST_PORT}`

3. `gateway`
- Role: bridge BLE/Wi-Fi -> MQTT (normalisation des messages capteurs)
- Dependance: `mqtt-broker`
- Pas de port expose par defaut

4. `face-detector`
- Role: stream hub (une entree ESP32-CAM vers plusieurs clients) + filtres video
- Port expose: `8890:8890`
- Source camera configurable via `ESP32_CAM_STREAM_URL`

5. `influxdb`
- Role: base de donnees time-series pour l'historique capteurs
- Volume persistant: `./databases/influxdb`
- Port expose: `${INFLUXDB_ORIGIN_PORT}:${INFLUXDB_DEST_PORT}`

Les services utilisent `depends_on` avec `healthcheck` pour demarrer dans le bon ordre.

---

## Explication du `.env.example`

Le fichier `src/.env.example` centralise la configuration locale.

### Variables backend

- `NODE_ENV`, `BACKEND_ORIGIN_PORT`, `BACKEND_DEST_PORT`
- `MQTT_TELEMETRY_SOURCE` pour choisir la source MQTT a ingerer (`telemetry`, `ecoguard`, `both` selon le backend)

### Variables bridge capteurs

- UUID BLE (`BLE_*`, `SERVICE_*`, `CHAR_*`)
- Identite capteur (`BLE_SENSOR_ID`, `BLE_ROOM`, `BLE_DEVICE_NAME`)
- Frequence de lecture (`BLE_READ_INTERVAL`)

### Variables MQTT

- `MQTT_BROKER_USERNAME`, `MQTT_BROKER_PASSWORD`
- `MQTT_BROKER_ORIGIN_PORT`, `MQTT_BROKER_DEST_PORT`

### Variables InfluxDB

- Initialisation (`INFLUXDB_INIT_*`)
- Ports (`INFLUXDB_ORIGIN_PORT`, `INFLUXDB_DEST_PORT`)

### Variables mobile

- `MOBILE_APP_ORIGIN_PORT`, `MOBILE_APP_DEST_PORT`

### Variables Wi-Fi camera

- `WIFI_SSID`, `WIFI_PASSWORD`, `CAMERA_IP`, `CAMERA_GATEWAY`, `CAMERA_SUBNET`

### Bonnes pratiques

- Copier `src/.env.example` vers `src/.env`
- Remplacer tous les secrets par des valeurs propres a votre environnement
- Ne jamais commiter `src/.env`

---

## Guides d'installation et d'utilisation

Les guides utilisateur sont disponibles dans `src/docs/user_docs`:

- `src/docs/user_docs/Manuel d'installation CesIoT.pdf`
- `src/docs/user_docs/Manuel utilisateur CesIoT.pdf`

Contenu attendu de cette section:

1. Installation
- Prerequis (Docker, Docker Compose, reseau local, carte ESP32)
- Configuration `.env`
- Lancement de la stack et verification des services

2. Utilisation
- Consultation des mesures capteurs
- Visualisation des flux camera et filtres
- Verification de l'etat des services (`/health`, WebSocket, MQTT)

---

## Technologies et fonctionnement par composant

### 1) Embedded (capteurs + camera)

- Dossier: `src/embedded`
- Techno: C++ / PlatformIO / ESP32
- Fonctionnement:
  - Les capteurs lisent les mesures physiques et les publient via bridge/MQTT.
  - L'ESP32-CAM expose un flux MJPEG consomme ensuite par le stream hub.

### 2) Gateway (bridge)

- Dossier: `src/gateway`
- Techno: Python, `paho-mqtt`, `pyyaml`
- Fonctionnement:
  - Abonnement a `ecoguard/sensors/#`
  - Normalisation des payloads
  - Republishing vers `sensors/{sensor_id}/telemetry`

### 3) MQTT Broker

- Dossier: `src/mqtt-broker`
- Techno: Eclipse Mosquitto
- Fonctionnement:
  - Transporte les messages telemetrie/commandes entre gateway et backend
  - Authentification par user/password

### 4) Backend API

- Dossier: `src/backend`
- Techno: FastAPI, Pydantic, `paho-mqtt`, `influxdb-client`, WebSocket
- Fonctionnement:
  - API REST: capteurs (`/api/sensors/*`) et camera (`/api/camera/*`)
  - Souscription MQTT et ecriture dans InfluxDB
  - Endpoint WebSocket `/ws` pour le temps reel

### 5) Face Detector / Stream Hub

- Dossier: `src/face-detector`
- Techno: Python, OpenCV, HTTP MJPEG
- Fonctionnement:
  - Maintient une seule connexion source vers l'ESP32-CAM
  - Redistribue vers plusieurs consommateurs
  - Applique des filtres (`raw`, `blur`, `quentin`, `grayscale`, etc.)

### 6) Base de donnees

- Service: `influxdb`
- Techno: InfluxDB 2.x
- Fonctionnement:
  - Stockage time-series des points `telemetry`
  - Requetes historique et latest via le backend

### 7) Front mobile

- Dossier: `src/mobile_app`
- Techno: React Native + Expo + Expo Router
- Fonctionnement:
  - Consomme l'API backend pour afficher etat capteurs et camera
  - Utilise HTTP/WebSocket pour la mise a jour temps reel

---

## Structure du depot

```bash
.
├── .github/
├── lessons/
├── src/
│   ├── backend/
│   ├── docs/
│   │   └── user_docs/
│   ├── embedded/
│   ├── face-detector/
│   ├── gateway/
│   ├── mobile_app/
│   ├── mqtt-broker/
│   ├── .env.example
│   └── docker-compose.yaml
└── README.md
```

---

## Demarrage rapide

```bash
cd src
cp .env.example .env
docker compose up --build
```

Verifier ensuite:

- API: `http://localhost:3000/health`
- Face detector: `http://localhost:8890/health`
- InfluxDB: `http://localhost:8086`

---

## Organisation de l'equipe (Roulement des roles)

Le projet est realise par une squad de 4 ingenieurs. Les roles techniques sont echanges chaque semaine afin de garantir une montee en competences globale et une maitrise complete de la chaine Full Stack IoT.

### Membres

- Benjamin
- Dylan
- Lucas
- Quentin

### Roles techniques

- Embedded Lead
- Edge Ops Lead
- Backend Architect
- Mobile & UX Lead

### Planning de rotation

|   Semaine | Embedded Lead | Edge Ops Lead | Backend Architect | Mobile & UX Lead |
| --------: | ------------- | ------------- | ----------------- | ---------------- |
| Semaine 1 | Quentin       | Dylan         | Lucas             | Benjamin         |
| Semaine 2 | Dylan         | Lucas         | Benjamin          | Quentin          |
| Semaine 3 | Lucas         | Benjamin      | Quentin           | Dylan            |
| Semaine 4 | Benjamin      | Quentin       | Dylan             | Lucas            |
| Semaine 5 | Quentin       | Dylan         | Lucas             | Benjamin         |

> Chaque semaine, le referent est responsable des choix techniques, de la stabilite et de la validation finale de son perimetre.

---

## Licence & cadre pedagogique

Projet academique realise dans un cadre pedagogique.
Toute reutilisation industrielle necessiterait une phase d'audit securite et conformite supplementaire.
