FROM node:22-bookworm-slim

RUN apt-get update && apt-get install -y redis-server && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci --omit=dev

COPY . .

COPY start.sh /start.sh
RUN chmod +x /start.sh

CMD ["/start.sh"]
