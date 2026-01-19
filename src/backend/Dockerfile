FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci || npm install

COPY src ./src

EXPOSE 80

CMD ["node", "src/index.js"]
