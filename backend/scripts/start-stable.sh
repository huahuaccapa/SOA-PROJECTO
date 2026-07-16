#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

echo "Iniciando Byteverse con reinicio automático..."
docker compose up -d --build

echo
echo "Estado de los contenedores:"
docker compose ps

echo
echo "Prueba del API Gateway:"
if curl -fsS http://localhost:3000/health; then
  echo
  echo "Backend disponible en http://localhost:3000"
else
  echo
  echo "El gateway todavía no responde. Revisa: docker compose logs -f auth-service api-gateway"
  exit 1
fi
