#!/usr/bin/env bash
set -u
cd "$(dirname "$0")/.."

echo "=== CONTENEDORES ==="
docker compose ps

echo "=== MYSQL ==="

echo "=== AUTH SERVICE ==="
docker compose logs --tail=100 auth-service

echo "=== API GATEWAY ==="
docker compose logs --tail=100 api-gateway

echo "=== HEALTH ==="
curl -i --max-time 10 http://localhost:3000/health || true
curl -i --max-time 10 http://localhost:3001/health/ready || true
