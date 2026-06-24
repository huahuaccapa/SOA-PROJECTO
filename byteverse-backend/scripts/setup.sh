#!/bin/bash

echo "=========================================="
echo "🚀 BYTEVERSE SOA - Setup"
echo "=========================================="
echo ""

# Verificar Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker no está instalado"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose no está instalado"
    exit 1
fi

echo "✅ Docker y Docker Compose encontrados"
echo ""

# Crear .env para servicios
echo "📝 Creando archivos .env..."

for service in auth-service users-service orders-service analytics-service inventory-service shipping-service review-service wishlist-service coupon-service audit-service; do
    if [ ! -f "services/$service/.env" ]; then
        cat > services/$service/.env << EOF
NODE_ENV=development
JWT_SECRET=byteverse_secret_key_2024
REFRESH_SECRET=byteverse_refresh_secret_2024
MONGODB_URI=mongodb://admin:password@mongodb:27017/byteverse?authSource=admin
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672
EOF
        echo "  ✅ .env creado para $service"
    fi
done

if [ ! -f "services/payment-service/.env" ]; then
    cat > services/payment-service/.env << EOF
STRIPE_SECRET_KEY=sk_test_...
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672
EOF
    echo "  ✅ .env creado para payment-service"
fi

echo ""
echo "🧹 Limpiando contenedores anteriores..."
docker-compose down -v 2>/dev/null

echo ""
echo "🏗️ Construyendo y levantando servicios..."
docker-compose up -d --build

echo ""
echo "⏳ Esperando que los servicios estén listos..."
sleep 10

echo ""
echo "=========================================="
echo "✅ ¡Sistema SOA iniciado!"
echo "=========================================="
echo ""
echo "🌐 SERVICIOS (15):"
echo "  📡 API Gateway:    http://localhost:3000"
echo "  🔐 Auth:           http://localhost:3001"
echo "  📦 Products:       http://localhost:3002"
echo "  📋 Orders:         http://localhost:3003"
echo "  👤 Users:          http://localhost:3004"
echo "  📧 Notifications:  http://localhost:3005"
echo "  📊 Analytics:      http://localhost:3006"
echo "  📦 Inventory:      http://localhost:3007"
echo "  💳 Payment:        http://localhost:3008"
echo "  🚚 Shipping:       http://localhost:3009"
echo "  ⭐ Reviews:        http://localhost:3010"
echo "  ❤️ Wishlist:       http://localhost:3011"
echo "  🎫 Coupons:        http://localhost:3012"
echo "  📝 Audit:          http://localhost:3013"
echo ""
echo "🐰 RabbitMQ:         http://localhost:15672 (guest/guest)"
echo "🍃 MongoDB:          mongodb://admin:password@localhost:27017"
echo "📊 Redis:            redis://localhost:6379"
echo ""
echo "📝 Logs: docker-compose logs -f"
echo "🛑 Detener: docker-compose down"
echo ""
echo "🧪 Probar: ./test.sh"