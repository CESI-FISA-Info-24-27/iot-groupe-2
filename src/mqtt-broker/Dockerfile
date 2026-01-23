FROM eclipse-mosquitto:2.0

# On copie le script d'initialisation
COPY docker-entrypoint.sh /docker-entrypoint.sh
# On le rend script exécutable
RUN chmod +x /docker-entrypoint.sh

# On le définit comme le point d'entrée
ENTRYPOINT ["/docker-entrypoint.sh"]
