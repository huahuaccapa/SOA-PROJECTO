#!/bin/bash

echo "=========================================="
echo "🧪 BYTEVERSE SOA - Pruebas"
echo "=========================================="
echo ""

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

test_service() {
    local name=$1
    local url=$2
    echo -n "  Testing $name... "
    
    if curl -s -o /dev/null -w "%{http_code}" --max-time 3 "$url" | grep -q "200"; then
        echo -e "${GREEN}✅ OK${NC}"
        return 0
    else
        echo -e "${RED}❌ FAIL${NC}"
        return 1
    fi
}

echo "📡 Probando servicios..."
echo ""

test_service "API Gateway" "http://localhost:3000/health"
test_service "Auth" "http://localhost:3001/health"
test_service "Products" "http://localhost:3002/health"
test_service "Orders" "http://localhost:3003/health"
test_service "Users" "http://localhost:3004/health"
test_service "Notifications" "http://localhost:3005/health"
test_service "Analytics" "http://localhost:3006/health"
test_service "Inventory" "http://localhost:3007/health"
test_service "Payment" "http://localhost:3008/health"
test_service "Shipping" "http://localhost:3009/health"
test_service "Reviews" "http://localhost:3010/health"
test_service "Wishlist" "http://localhost:3011/health"
test_service "Coupons" "http://localhost:3012/health"
test_service "Audit" "http://localhost:3013/health"

echo ""
echo "=========================================="
echo "🔐 Prueba de Login"
echo "=========================================="

echo -n "  Login vía Auth Service directo... "
LOGIN_DIRECT=$(curl -s -X POST http://localhost:3001/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@byteverse.com","password":"123456"}')

if echo "$LOGIN_DIRECT" | grep -q "success"; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${RED}❌ FAIL${NC}"
fi

echo -n "  Login vía API Gateway... "
LOGIN_GATEWAY=$(curl -s -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@byteverse.com","password":"123456"}')

if echo "$LOGIN_GATEWAY" | grep -q "success"; then
    echo -e "${GREEN}✅ OK${NC}"
    TOKEN=$(echo "$LOGIN_GATEWAY" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4 | cut -c1-30)
    echo "  📝 Token: ${TOKEN}..."
else
    echo -e "${RED}❌ FAIL${NC}"
fi

echo ""
echo "=========================================="
echo "📦 Productos vía Gateway"
echo "=========================================="

echo -n "  GET /api/products... "
PRODUCTS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/products)
if [ "$PRODUCTS" = "200" ]; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${RED}❌ FAIL (HTTP $PRODUCTS)${NC}"
fi

echo ""
echo "=========================================="
echo "✅ Pruebas completadas!"
echo "=========================================="