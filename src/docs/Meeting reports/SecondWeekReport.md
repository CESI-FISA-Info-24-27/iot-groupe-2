# Compte rendu du projet - semaine 2

```
Date : 26/01/2026
Lieu : CESI Montpellier - Salle 8
Participants :
 - BEROUD Dylan
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

- Transformation complète du backend vers FastAPI (en python).

**Pour cette semaine** :

- Mettre en place les endpoints pour récupérer les données de capteurs.
- Mettre en place les endpoints pour nourrir la base de données.

### 2. Embedded

Durant cette semaine, le travail s’est concentré sur la mise en place du Raspberry Pi.

- Flash de la carte SD pour ajouter l'OS Raspberry Pi 5.
- Mise en place des accès ssh ET de Raspberry Pi Connect.

**Pour cette semaine** :

- Télécharger Docker sur la carte pour pouvoir lancer les conteneurs.
- Tests du CD.

### 3. Frontend

L’application mobile a été initialisée avec Expo Go et React Native. L'UI reste primitive.

**Pour cette semaine** :

* Améliorer l'UI pour la rendre plus user-friendly.
* Ajouter un onglet pour voir les statistiques générales :
  * Un onglet pour voir en temps réel les capteurs
  * Un onglet pour voir la caméra en temps réel avec des actions du style "prendre en photo".
  * Un onglet pour voir la température au fil du temps, etc...

### 4. Edge ops

- Conteneurisation complètement finie.
- CI quasiment fini :
  - Les linters sont en place.
  - Tests de build des images dockers.
- CD en cours :
  - Création d'un réseau virtuelle entre le raspberry et les runners github via Tailscale.

**Pour cette semaine** :

- Ajouter des tests unitaires qui se lancent pendant la CI.
- Installer Docker sur le rasp pour le déploiement de la CD.
- Finir la CD.
