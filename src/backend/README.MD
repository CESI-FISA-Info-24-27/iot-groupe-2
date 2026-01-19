# 🧩 Backend – EcoGuard 360

Ce dossier contient le **backend Edge** du projet **EcoGuard 360**. Il constitue le cœur logiciel de la Gateway (Raspberry Pi) et assure la **convergence des flux IoT** : télémétrie capteurs, commandes actionneurs, stockage time-series et diffusion temps réel vers l’application mobile.

---

## 🎯 Rôle du backend

Le backend a pour responsabilités principales :

- 📡 **Consommer les données terrain** publiées sur MQTT
- 🗄️ **Stocker les séries temporelles** dans InfluxDB
- 🔁 **Exposer une API REST** pour l’historique et le contrôle
- ⚡ **Diffuser les mises à jour temps réel** via WebSocket
- 🧠 Servir de **couche d’abstraction** entre le monde terrain (BLE/WiFi) et le frontend mobile

Le backend est **agnostique des protocoles capteurs** (BLE/WiFi) et ne consomme que des messages MQTT normalisés.

---

## 🧱 Stack technique

| Composant        | Technologie             |
| ---------------- | ----------------------- |
| Runtime          | Node.js 20              |
| Framework API    | Express (CommonJS)      |
| Message Bus      | MQTT (Mosquitto)        |
| Base de données  | InfluxDB 2.x            |
| Temps réel       | WebSocket (`ws`)        |
| Conteneurisation | Docker / Docker Compose |

---

## 📁 Structure du dossier

```bash
backend/
 ├─ src/
 │   ├─ index.js              # Entrée serveur HTTP + wiring services
 │   ├─ app.js                # App Express (middlewares + routes)
 │   ├─ config/
 │   │   └─ env.js             # Centralisation des variables d’environnement
 │   ├─ routes/
 │   │   └─ sensors.routes.js  # Endpoints capteurs & actionneurs
 │   ├─ services/
 │   │   ├─ mqtt.service.js    # Client MQTT (connect, subscribe, publish)
 │   │   └─ influx.service.js  # Client InfluxDB (write/query/health)
 │   └─ websocket/
 │       └─ ws.js              # Serveur WebSocket
 ├─ Dockerfile
 ├─ docker-compose.yml
 ├─ .env.example
 └─ package.json
```

---

## 🔗 Flux de données

### Chaîne télémétrie (critique)

```
ESP32 (BLE) → Bridge Python (Pi) → MQTT → Backend → InfluxDB → API /history → Mobile
```

### Chaîne commande actionneur

```
Mobile → API /action → MQTT → Bridge Python → BLE Write → Actionneur
```

---

## 📡 Convention MQTT

### Topic télémétrie

```
sensors/<sensor_id>/telemetry
```

### Payload attendu

```json
{
  "room": "room1",
  "sensor_id": "sense-01",
  "metric": "temperature",
  "value": 23.4,
  "ts": 1768381684000
}
```

---

## 🗄️ Modèle InfluxDB

- **Measurement** : `telemetry`
- **Tags** : `room`, `sensor_id`, `metric`
- **Field** : `value`
- **Time** : `ts` (ms, fallback sur `Date.now()`)

Ce modèle permet des requêtes efficaces pour l’historique et l’analyse temporelle.

---

## 🌐 API HTTP

### Health check

```http
GET /health
```

Retourne l’état des dépendances :

```json
{
  "status": "healthy",
  "services": {
    "mqtt": "up",
    "influxdb": "up"
  }
}
```

---

### Historique capteurs

```http
GET /api/sensors/history?sensor=temperature&room=room1&range=24h
```

---

### Commande actionneur

```http
POST /api/sensors/action
Content-Type: application/json
```

```json
{
  "target": "led1",
  "state": "ON",
  "room": "room1"
}
```

---

## ⚡ WebSocket

- Endpoint : `/ws`
- Usage : diffusion temps réel des événements télémétrie

Exemple de message :

```json
{
  "type": "telemetry",
  "sensor_id": "sense-01",
  "metric": "temperature",
  "value": 23.4,
  "ts": 1768381684000
}
```

---

## 🐳 Lancement avec Docker

### Préparer l’environnement

Créer un fichier `.env` (non commité) à partir de `.env.example`.

### Démarrer la stack complète

```bash
docker-compose up -d --build
```

### Logs

```bash
docker-compose logs -f api
```

---

## 🧪 Tests rapides

### Publier une donnée MQTT

```bash
mosquitto_pub -h localhost -p 1883 -t sensors/sense-01/telemetry \
  -m '{"room":"room1","sensor_id":"sense-01","metric":"temperature","value":23.4}'
```

### Vérifier l’historique

```bash
curl "http://localhost:8000/api/sensors/history?sensor=temperature&room=room1&range=1h"
```

---

## 🔐 Sécurité (MVP)

- Secrets gérés via variables d’environnement
- Aucun mot de passe en dur dans le code
- Mosquitto configuré en `allow_anonymous true` pour le MVP

> Une évolution vers ACL + authentification est prévue.

---

## 👨‍💻 Rôle projet

Ce backend a été conçu et implémenté dans le cadre du rôle **Backend Architect**.
Il est prêt à être consommé par :

- le **bridge BLE ↔ MQTT** (Edge Ops Lead)
- l’**application mobile** (Mobile & UX Lead)

---

🟢 **Backend EcoGuard 360 — prêt pour l’intégration terrain**
