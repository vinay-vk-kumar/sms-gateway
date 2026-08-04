FROM node:18-bullseye-slim

# Install Redis server
RUN apt-get update && apt-get install -y redis-server && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./

RUN npm ci --only=production

# Bundle app source
COPY . .

# Copy and make the start script executable
COPY start.sh /start.sh
RUN chmod +x /start.sh

# Start both Redis and Node.js
CMD ["/start.sh"]
