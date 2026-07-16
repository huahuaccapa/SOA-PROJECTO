# ByteVerse — SOA-PROJECTO

ByteVerse es una plataforma de comercio electrónico construida con una arquitectura de microservicios (API Gateway + servicios independientes), que usa MySQL, RabbitMQ y Redis. Está pensada como proyecto educativo/producción ligera para demostrar un ecosistema de e‑commerce con login (incluyendo Google Identity), catálogo, carrito, órdenes, pagos y servicios de soporte (notificaciones, analytics, etc.).

## Stack
- **Lenguajes:** JavaScript/Node.js (backend), React (frontend). Algunos servicios pueden incluir Python.
- **Runtime / Frameworks:** Node.js (Express u otro framework en los microservicios), Vite + React para frontend.
- **Infra y mensajería:** MySQL, Redis, RabbitMQ, Docker Compose.
- **Notable librerías:** google-auth-library (Google ID verification), JWT (auth), axios/fetch (cliente API), librerías habituales de Node/React.

## Cómo está organizado
```
/                   Raíz del repositorio
  backend/          Código del backend (API Gateway, docker-compose, init SQL, microservicios)
    api-gateway/    Puerta de entrada HTTP (index.js, Dockerfile)
    services/       Carpetas por microservicio (auth, products, orders, payment, etc.)
    docker-compose.yml  Orquestación local de servicios (MySQL, Redis, RabbitMQ, gateway, servicios)
    mysql-init.sql   Script para crear tablas/seed inicial
    README.md        Documentación específica del backend (instrucciones de arranque, variables de entorno)
  frontend/         Aplicación React (Vite) que consume el API Gateway
    src/            Código fuente React (pages, components, services)
    public/         Archivos estáticos
    package.json     Scripts de desarrollo/producción
    README.md        Documentación específica del frontend (inicio rápido, variables VITE_*)
  *.zip             Artefactos (copias empaquetadas del frontend/backend)
  README.md         Este archivo (documentación general del proyecto)
```

Cómo encaja: El frontend (Vite+React) se conecta al API Gateway en `http://localhost:3000/api` para todas las operaciones del e‑commerce. El API Gateway enruta peticiones a los microservicios correspondientes (auth, products, orders, payment, etc.). MySQL es la persistencia relacional principal; Redis y RabbitMQ se usan para cache y mensajería/colas entre servicios.

---

## Requisitos
- Docker y Docker Compose (v2 preferible)
- Node.js 16+ (para desarrollo frontend y servicios locales si no se usan contenedores)
- npm o yarn

## Ejecución rápida (modo recomendado: Docker Compose)
1. Copia los ejemplos de variables de entorno si existen:

```bash
# En el directorio backend:
cp backend/.env.example backend/.env
# En el directorio frontend:
cp frontend/.env.example frontend/.env
```

2. Inicializa la base de datos (opcional si Docker Compose ya ejecuta el init):

```bash
# Ejecutar mysql-init.sql en tu instancia MySQL local o dejar que el contenedor lo ejecute
# Ejemplo local (si tienes mysql cliente):
mysql -u root -p < backend/mysql-init.sql
```

3. Levanta los servicios con Docker Compose:

```bash
cd backend
docker compose up -d --build
```

- La API (API Gateway) queda disponible en: http://localhost:3000
- El frontend (modo dev) en: http://localhost:5173

Para ver logs y estado:

```bash
docker compose ps
docker compose logs -f
docker compose stop|start|down
```

## Ejecutar solo el frontend en desarrollo
```bash
cd frontend
npm install
npm run dev
# Visitar: http://localhost:5173
```
Asegúrate de establecer `VITE_API_URL=http://localhost:3000/api` en `.env`.

## Variables importantes (resumen)
En backend (.env):
```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
FRONTEND_URL=http://localhost:5173
OAUTH_STATE_SECRET=clave_aleatoria
COOKIE_SECURE=false
```
En frontend (.env):
```
VITE_API_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
VITE_GOOGLE_CLIENT_ID=
VITE_GOOGLE_LOGIN_MODE=auto
```
Consulta `backend/README.md` y `frontend/README.md` para detalles extendidos sobre Google Identity y configuración.

## Login con Google
- Flujo principal: Google Identity Services (frontend obtiene ID token y lo envía a `POST /api/auth/google/token`).
- El backend valida con `google-auth-library`, crea/vincula usuarios y devuelve los JWT usados por la aplicación.
- Para el flujo por redirección se usa `GOOGLE_CALLBACK_URL` y `GOOGLE_CLIENT_SECRET`.

## Salud y endpoints útiles
- Salud general API: GET http://localhost:3000/health
- Salud de servicios internos: GET http://localhost:3000/health/services
- Health auth ready: GET http://localhost:3000/api/auth/health/ready

## Usuarios de prueba
Contraseña inicial: `123456`
- admin@byteverse.com
- comprador@byteverse.com
- vendedor@byteverse.com (solicita cambio de contraseña en el primer acceso)

## Servicios incluidos (lista corta)
- auth-service — autenticación, JWT, Google login
- products-service — catálogo, búsqueda y filtros
- orders-service — gestión de órdenes y estado
- payment-service — integración simulada de pagos
- inventory-service — stock y disponibilidad
- notifications-service — notificaciones por eventos
- review-service, wishlist-service, vendor-cart-service, analytics-service, audit-service, coupon-service, shipping-service, etc.
(Ver `backend/services/` para la lista completa y la estructura de cada microservicio.)

## Desarrollo & Contribuciones
- Lee `backend/README.md` para entender cómo arrancan los servicios y qué variables se esperan.
- Para agregar un nuevo microservicio: crea una carpeta bajo `backend/services/<nombre>-service`, añade Dockerfile/package.json y registra el servicio en `backend/docker-compose.yml` y en la configuración del API Gateway.
- Para cambios en frontend: sigue la estructura `frontend/src/` (pages, components, services).

## Compilación / Producción
- Frontend:
  - `npm run build` dentro de `frontend/` genera la versión de producción.
  - `npm run preview` para probar la build localmente.
- Backend:
  - El despliegue en producción dependerá del orquestador elegido; `backend/docker-compose.yml` sirve para pruebas locales.

## Recursos y documentación adicional
- Documentación del backend: `backend/README.md`
- Documentación del frontend: `frontend/README.md`
- Script de inicialización MySQL: `backend/mysql-init.sql`
- Orquestación local: `backend/docker-compose.yml`

