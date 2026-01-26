# Compte rendu du projet - semaine 1

```
Date : 19/01/2026
Lieu : CESI Montpellier - Salle 8
Participants :
 - BEROUD Dylan
 - REPELLIN Benjamin
 - CROUZET Lucas
```

## PROJET

**État actuel** :

- Architecture backend normalisée autour de Node.js (Express)
- Bus de messages MQTT (Mosquitto) opérationnel
- Base de données InfluxDB intégrée pour les séries temporelles
- API REST exposant l’historique et les commandes actionneurs
- WebSocket fonctionnel pour la diffusion temps réel
- Stack entièrement dockerisée et déployable via docker-compose
- Endpoint /health permettant de superviser l’état MQTT / InfluxDB
- Frontend initialisé
- Environnement de développement front sur mobile

## Travail réalisé durant la semaine

### 1. Backend

- Normalisation complète du backend en CommonJS
- Suppression de MongoDB et alignement avec InfluxDB (conforme au cahier des charges)
- Implémentation de l’ingestion MQTT → InfluxDB
- Mise en place des endpoints :
  - GET /health
  - GET /api/sensors/history
  - POST /api/sensors/action
- Mise en place du serveur WebSocket pour les mises à jour temps réel
- Conteneurisation complète (Dockerfile + docker-compose)

**Pour cette semaine** :

- Valider l’environnement (avant intégration capteurs)
- Définir + figer le contrat MQTT (avec Lucas/Dylan)
- Vérifier l’ingestion MQTT → Influx en conditions réelles
- Stabiliser la partie WebSocket

### 2. Embedded

Durant cette semaine, le travail s’est concentré sur la mise en place matérielle et les premiers tests capteurs.

- Mise en place du matériel sur une plaque d’expérimentation (breadboard) afin de permettre des tests rapides sans soudure.
- Branchement et tests initiaux des composants suivants :
  - ESP32-CAM (nœud Vision)
  - Capteur de température (mesure environnementale)
  - Capteur de distance (utilisé comme capteur de présence/proximité)
- Vérification de l’alimentation, du câblage et de la détection correcte des capteurs par l’ESP32.
- Validation que les capteurs renvoient des valeurs exploitables côté firmware.

**Pour cette semaine** :

- Implémentation du serveur BLE GATT pour le nœud Sense
- Transmission fiable des données vers la Gateway

### 3. Frontend

L’application mobile a été initialisée avec Expo Go et React Native.

La structure de base du projet est en place :

- Navigation initiale
- Écrans de test
- Environnement de développement fonctionnel sur mobile

Le frontend est actuellement décorrélé du backend :

- Aucune connexion à l’API
- Données simulées ou absentes
- L’interface est fonctionnelle mais très basique :
  - Pas encore de travail approfondi sur l’UX/UI
  - Pas de charte graphique définie
  - Pas d’adaptation spécifique aux cas d’usage (alertes, criticité, temps réel)

**Pour cette semaine** :

### 4. Edge ops

- Docker-Compose finit => conteneurisation de :

  - API Backend (ExpressJS)
  - Databases (InfluxDB)
  - Gateway
  - Broker MQTT
  - Frontend (React Native)
- CI en place :

  - vérification Lint du code Python
  - vérification Lint du code C++
  - vérification de la buildabilité du docker-compose (en cours car quelques bugs sont survenus).

**Pour cette semaine** :

- Régler le problème de la CI sur la buildabilité du docker-compose
- Documentation qui s'auto-déploie via Github Pages
- Ajouter Sonar au projet
