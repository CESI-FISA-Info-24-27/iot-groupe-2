FROM python:3.12-slim

WORKDIR /app

# On copie et installe les dépendances Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# On copie le code de l'application
COPY app/ app/
COPY config/ config/

# On lance la commande par défaut
CMD ["python", "app/main.py"]
