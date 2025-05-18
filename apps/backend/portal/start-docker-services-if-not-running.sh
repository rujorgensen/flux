#!/bin/bash

# Check if the services are already running
RUNNING=$(docker compose -p flux-dev -f .deploy/docker-compose.dev.yml ps -q)

if [ -z "$RUNNING" ]; then
  echo "Services are not running. Starting services..."
  docker compose -p flux-dev -f .deploy/docker-compose.dev.yml up -d --build
else
  echo "Services already running. Doing nothing."
fi
