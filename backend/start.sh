#!/bin/bash

# 1. Start Redis in the background with default configurations
echo "Starting Redis server..."
redis-server --daemonize yes

# Wait briefly to ensure Redis has started
sleep 2

# 2. Start the Node.js application in the foreground
echo "Starting Node.js backend..."
npm run start
