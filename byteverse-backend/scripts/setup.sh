#!/bin/bash

echo "🚀 ByteVerse SOA Backend - Setup"

# Verificar Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker no está instalado"
    exit 1
fi

# Verificar Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose no está instalado"
    exit 1
fi

echo "✅ Docker y Docker Compose encontrados"

# Crear .env para servicios Node.js
for service in auth-service orders-service users-service analytics-service; do
    if [ ! -f "services/$service/.env" ]; then
        cat > services/$service/.env << EOF
NODE_ENV=development
JWT_SECRET=byteverse_secret_key_2024
MONGODB_URI=mongodb://admin:password@mongodb:27017/byteverse?authSource=admin
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672
EOF
        echo "📝 .env creado para $service"
    fi
done

# Limpiar contenedores anteriores
echo "🧹 Limpiando contenedores anteriores..."
docker-compose down -v 2>/dev/null

# Construir y levantar
echo "🏗️ Construyendo y levantando servicios..."
docker-compose up -d --build

echo ""
echo "✅ ¡Sistema iniciado!"
echo ""
echo "🌐 Servicios:"
echo "  API Gateway:    http://localhost:3000"
echo "  Auth:           http://localhost:3001"
echo "  Products:       http://localhost:3002"
echo "  Orders:         http://localhost:3003"
echo "  Users:          http://localhost:3004"
echo "  Notifications:  http://localhost:3005"
echo "  Analytics:      http://localhost:3006"
echo ""
echo "🐰 RabbitMQ:     http://localhost:15672 (guest/guest)"
echo "🍃 MongoDB:      mongodb://admin:password@localhost:27017"
echo ""
echo "📝 Logs: docker-compose logs -f"
echo "🛑 Detener: docker-compose down"