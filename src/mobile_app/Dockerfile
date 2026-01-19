FROM node:20-alpine

WORKDIR /app

# On installe les dépendances système
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git

# On copie les fichiers de configuration
COPY package.json ./
COPY package-lock.json* ./

# On installe les dépendances NPM
RUN npm install --legacy-peer-deps

# On copie le code source
COPY . .

# On expose le bon port
EXPOSE ${MOBILE_APP_ORIGIN_PORT}

# On démarre l'application
CMD ["npm", "run", "start"]