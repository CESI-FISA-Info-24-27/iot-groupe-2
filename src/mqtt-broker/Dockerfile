FROM eclipse-mosquitto:2.0

COPY docker-entrypoint.sh /docker-entrypoint.sh

# 🔥 FIX WINDOWS LINE ENDINGS DANS L'IMAGE
RUN sed -i 's/\r$//' /docker-entrypoint.sh \
    && chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]
