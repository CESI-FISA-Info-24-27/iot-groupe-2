FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm i

COPY src ./src

EXPOSE ${BACKEND_ORIGIN_PORT}

CMD ["npm", "run", "start"]
