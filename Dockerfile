FROM node:22-alpine

WORKDIR /app

# Install build dependencies for native modules if needed
RUN apk add --no-cache python3 make g++

COPY package*.json ./

RUN npm ci --omit=dev

COPY . .

# Ensure data directory exists
RUN mkdir -p /app/data

ENV NODE_ENV=production

CMD ["node", "src/index.js"]
