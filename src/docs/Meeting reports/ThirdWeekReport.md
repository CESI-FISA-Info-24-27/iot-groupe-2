# Compte rendu du projet - semaine 3

```
Date : 26/01/2026
Lieu : CESI Montpellier - Salle 8
Participants :
 - BEROUD Dylan
 - REPELLIN Benjamin
 - JOLY Quentin
 - CROUZET Lucas
```

## PROJET

**État actuel** :

- Architecture backend normalisée autour de FastAPI.
- CI quasiment finie (avec SonarCube).
- CD en cours de déploiement.
- Base de données InfluxDB intégrée pour les séries temporelles.
- Stack entièrement dockerisée et déployable via docker-compose
- Frontend initialisé

## Travail réalisé durant la semaine

### 1. Backend

- Développement du bridge entre le BLE et le MQTT (quasiment fini).

**Pour cette semaine** :

- Finir la mise en place du bridge.
- Mettre en place les endpoints pour nourrir la base de données.

### 2. Embedded

Durant cette semaine, le travail s’est concentré sur la mise en place du Raspberry Pi.

- Flash de la carte SD pour ajouter l'OS Raspberry Pi 5.
- Mise en place des accès ssh ET de Raspberry Pi Connect.

**Pour cette semaine** :

- Télécharger Docker sur la carte pour pouvoir lancer les conteneurs.
- Tests du CD.

### 3. Frontend

L’application mobile a été initialisée avec Expo Go et React Native.

- Mise en place de plusieurs pages (temps réel, la caméra, le status du système, les réglages).
- Récupération de la caméra en temps réel.

**Pour cette semaine** :

* Récupérer les informations des capteurs en temps réel.
* Afficher des graphiques des capteurs au fil du temps.

### 4. Edge ops

- CD complètement terminée.

**Pour cette semaine** :

- Ajouter des tests unitaires qui se lancent pendant la CI.
