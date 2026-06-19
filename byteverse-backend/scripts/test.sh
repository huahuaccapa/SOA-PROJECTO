#!/bin/bash

echo "🧪 Probando servicios..."

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

test_service() {
    local name=$1
    local url=$2
    echo -n "Testing $name... "
    
    if curl -s -o /dev/null -w "%{http_code}" $url | grep -q "200"; then
        echo -e "${GREEN}✅ OK${NC}"
    else
        echo -e "${RED}❌ FAIL${NC}"
    fi
}

test_service "API Gateway" "http://localhost:3000/health"
test_service "Auth" "http://localhost:3001/health"
test_service "Products" "http://localhost:3002/health"
test_service "Orders" "http://localhost:3003/health"
test_service "Users" "http://localhost:3004/health"
test_service "Notifications" "http://localhost:3005/health"
test_service "Analytics" "http://localhost:3006/health"

echo ""
echo "🔐 Probando login..."
response=$(curl -s -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@byteverse.com","password":"123456"}')

if echo "$response" | grep -q "success"; then
    echo -e "${GREEN}✅ Login OK${NC}"
    token=$(echo "$response" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    echo "📝 Token obtenido: ${token:0:30}..."
else
    echo -e "${RED}❌ Login FAIL${NC}"
fi

echo ""
echo "📦 Probando productos..."
if curl -s http://localhost:3000/api/products | grep -q "nombre"; then
    echo -e "${GREEN}✅ Products OK${NC}"
else
    echo -e "${RED}❌ Products FAIL${NC}"
fi