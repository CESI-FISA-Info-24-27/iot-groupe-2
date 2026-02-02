#!/bin/sh
# Script d'initialisation du broker Mosquitto
# On crée le fichier passwd à partir des variables d'environnement

set -e

MOSQUITTO_USERNAME=${MOSQUITTO_USERNAME:-}
MOSQUITTO_PASSWORD=${MOSQUITTO_PASSWORD:-}
PASSWD_FILE="/mosquitto/config/passwd"

# On vérifie que les variables sont définies
if [ -z "$MOSQUITTO_USERNAME" ]; then
    echo "Erreur: MOSQUITTO_USERNAME n'est pas défini"
    exit 1
fi

if [ -z "$MOSQUITTO_PASSWORD" ]; then
    echo "Erreur: MOSQUITTO_PASSWORD n'est pas défini"
    exit 1
fi

echo "Initialisation de Mosquitto..."
echo "Création de l'utilisateur: $MOSQUITTO_USERNAME"

# S'assurer que le répertoire config existe et a les bonnes permissions
echo "Vérification des répertoires..."
ls -la /mosquitto/
ls -la /mosquitto/config/ || echo "Le répertoire /mosquitto/config n'existe pas"

# Fixer les permissions du répertoire
chmod 755 /mosquitto/config 2>&1 || echo "Impossible de changer les permissions du répertoire"
echo "Permissions du répertoire: $(ls -ld /mosquitto/config | awk '{print $1}')"


# On crée le fichier passwd
echo "Création du fichier passwd..."
mosquitto_passwd -c -b "$PASSWD_FILE" "$MOSQUITTO_USERNAME" "$MOSQUITTO_PASSWORD"
chown mosquitto:mosquitto "$PASSWD_FILE"
chmod 640 "$PASSWD_FILE"

 # Vérifier que le fichier a été créé
if [ -f "$PASSWD_FILE" ]; then
    echo "✓ Fichier créé"

# Lancer Mosquitto (process principal du conteneur)
exec mosquitto -c /mosquitto/config/mosquitto.conf
    ls -la "$PASSWD_FILE"
    
    # Fixer les permissions du fichier
    chmod 644 "$PASSWD_FILE"
    echo "Permissions du fichier: $(ls -l $PASSWD_FILE | awk '{print $1}')"
    
    # Vérifier que mosquitto peut le lire
    echo "Contenu du fichier (première ligne):"
    head -1 "$PASSWD_FILE"
else
    echo "✗ Le fichier passwd n'a pas pu être créé"
    exit 1
fi

echo ""
echo "Démarrage du broker Mosquitto..."
echo ""

# On lance Mosquitto avec les paramètres fournis
exec /usr/sbin/mosquitto -c /mosquitto/config/mosquitto.conf