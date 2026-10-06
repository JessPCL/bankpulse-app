# BANKPULSE - imagen de la API (SVC-BP-01: bankpulse-api)
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

# Dependencias primero para aprovechar la cache de capas.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY scripts ./scripts

USER node
EXPOSE 3000
CMD ["node", "src/app.js"]
