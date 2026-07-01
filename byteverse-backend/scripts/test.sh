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

echo "📡 Probando servicios (17 servicios)..."
echo ""

# Servicios existentes
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

# ✅ NUEVOS SERVICIOS
test_service "Categories" "http://localhost:3014/health"
test_service "Vendor Cart" "http://localhost:3015/health"

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
echo "📂 Categories vía Gateway"
echo "=========================================="

echo -n "  GET /api/categories... "
CATEGORIES=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/categories)
if [ "$CATEGORIES" = "200" ]; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${RED}❌ FAIL (HTTP $CATEGORIES)${NC}"
fi

echo ""
echo "=========================================="
echo "🛒 Vendor Cart vía Gateway"
echo "=========================================="

echo -n "  POST /api/vendor/cart... "
CART_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/vendor/cart \
    -H "Content-Type: application/json" \
    -d '{"vendorId":"67a1b2c3d4e5f67890abcdef","productId":"test123","nombre":"Producto Test","precio":99.99,"cantidad":1}')
if [ "$CART_RESPONSE" = "200" ] || [ "$CART_RESPONSE" = "201" ]; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${RED}❌ FAIL (HTTP $CART_RESPONSE)${NC}"
fi

echo ""
echo "=========================================="
echo "✅ Pruebas completadas!"
echo "=========================================="