# 🌱 EcoGuard 360 — Système de Surveillance Hybride Edge IoT

Projet réalisé dans le cadre du module **IoT – FISA A4 Informatique**.

EcoGuard 360 est un **MVP de système de surveillance industriel hybride** combinant **sécurité physique** et **efficacité énergétique**, basé sur une architecture **Edge Computing Open Source**, résiliente et indépendante du cloud.

---

## 🎯 Objectifs du projet

- Assurer la **surveillance vidéo locale** (levée de doute en cas d’intrusion)
- Collecter des **données environnementales basse consommation** (température, bruit, présence)
- Mettre en place des **automatismes intelligents** (extinction, ventilation)
- Garantir la **maîtrise totale de la donnée** (LAN isolé, pas de cloud)
- Démontrer une **architecture IoT industrielle robuste et interopérable**

---

## 🧠 Architecture Générale

- **Edge Gateway** : Raspberry Pi 4 (Linux)
- **Nœuds Vision** : ESP32-CAM (WiFi – flux vidéo MJPEG)
- **Nœuds Sense** : ESP32 (Bluetooth Low Energy uniquement)
- **Infrastructure réseau** : LAN isolé (Air-Gapped)

Séparation stricte des flux :

- **Flux lourds** : Vidéo (WiFi / HTTP)
- **Flux critiques** : Télémétrie & commandes (BLE ↔ MQTT)

---

## 🧰 Stack Technologique

| Couche                 | Technologie                            |
| ---------------------- | -------------------------------------- |
| Firmware embarqué      | C++ (Arduino / ESP32 Core 2.0.14)      |
| Bridge Edge BLE ↔ MQTT | Python (AsyncIO, Bleak)                |
| Message Broker         | Mosquitto (MQTT, QoS 1, persistance)   |
| Backend API            | JavaScript (Node.js / Express)         |
| Base de données        | SQLite ou InfluxDB                     |
| Application mobile     | Flutter (Dart)                         |
| DevOps                 | Docker, Docker Compose, GitHub Actions |

---

## 🔁 Organisation de l’équipe (Roulement des rôles)

Le projet est réalisé par une **squad de 4 ingénieurs**. Les rôles techniques sont **échangés chaque semaine** afin de garantir une montée en compétences globale et une maîtrise complète de la chaîne Full Stack IoT.

### 👥 Membres

- Benjamin
- Dylan
- Lucas
- Quentin

### 🎯 Rôles techniques

- Embedded Lead
- Edge Ops Lead
- Backend Architect
- Mobile & UX Lead

### 📅 Planning de rotation

|   Semaine | Embedded Lead | Edge Ops Lead | Backend Architect | Mobile & UX Lead |
| --------: | ------------- | ------------- | ----------------- | ---------------- |
| Semaine 1 | Quentin       | Dylan         | Lucas             | Benjamin         |
| Semaine 2 | Dylan         | Lucas         | Benjamin          | Quentin          |
| Semaine 3 | Lucas         | Benjamin      | Quentin           | Dylan            |
| Semaine 4 | Benjamin      | Quentin       | Dylan             | Lucas            |
| Semaine 5 | Quentin       | Dylan         | Lucas             | Benjamin         |

> Chaque semaine, le référent est responsable des choix techniques, de la stabilité et de la validation finale de son périmètre.

---

## 🧩 Responsabilités par rôle

### 🔧 Embedded Lead

- Développement firmware ESP32 / ESP32-CAM
- Implémentation des services BLE (GATT Server)
- Gestion des capteurs et actionneurs
- Optimisation du streaming vidéo MJPEG

**Technologie :** C++ (Arduino / PlatformIO)

---

### 🌐 Edge Ops Lead

- Développement du bridge BLE ↔ MQTT
- Gestion du cycle de vie BLE (scan, reconnexion, auto-healing)
- Proxy LWT (capteurs BLE)
- Conteneurisation et orchestration Docker

**Technologies :** Python, Docker, Linux

---

### 🧩 Backend Architect

- Développement de l’API REST & WebSocket
- Ingestion MQTT → base de données Time-Series
- Implémentation des règles métier (présence, fail-safe, alertes)
- Synchronisation temps réel avec l’application mobile

**Technologies :** JavaScript (Node.js / Express), MQTT, SQLite / InfluxDB

---

### 📱 Mobile & UX Lead

- Développement de l’application mobile cross-platform
- Gestion du state management temps réel
- Affichage du flux vidéo MJPEG
- UX réactive et gestion des états OFFLINE

**Technologie :** Flutter (Dart)

---

## 📁 Structure du dépôt

```bash
.
 .github/
    workflows/
 src/
    embedded/
        ble_sensor_node/
        wifi_cam_node/
    gateway/
        app/
        config/
        Dockerfile
        requirements.txt
    backend/
        src/
        Dockerfile
        docker-compose.yml
    mobile_app/
        lib/
        pubspec.yaml
    docs/
        architecture_diagram.png
        api_swagger.json
        user_manual.md
 README.md
```

---

## 🚀 Déploiement rapide

```bash
# Lancer toute la stack Edge
docker-compose up --build
```

Les données sont persistées via des **volumes Docker**. Aucun secret n’est stocké en dur (usage de fichiers `.env`).

---

## ✅ Fonctionnalités clés du MVP

- Streaming vidéo temps réel (< 500 ms)
- Capture automatique d’image sur alerte sonore
- Historique des températures (24h)
- Automatismes intelligents (présence, fail-safe)
- Commande distante avec accusé de réception (< 200 ms)
- Détection des capteurs OFFLINE (< 30 s)

---

## 📜 Licence & Cadre pédagogique

Projet académique réalisé dans un cadre pédagogique.
Toute réutilisation industrielle nécessiterait une phase d’audit sécurité et conformité supplémentaire.

---

🌱 **EcoGuard 360 — Edge Intelligence for Sustainable & Secure Buildings**
