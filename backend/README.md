# ByteVerse Backend

Backend de ByteVerse basado en un API Gateway, MySQL, RabbitMQ, Redis y microservicios Node.js/Python.

## Inicio rápido en Windows con Docker

1. Crea la base de datos ejecutando `mysql-init.sql` en MySQL local.
2. Copia `.env.example` como `.env` y coloca tu contraseña de MySQL.
3. Inicia los servicios:

```bash
docker compose up -d --build
```

La API queda disponible en `http://localhost:3000`.

Comandos útiles:

```bash
docker compose ps
docker compose logs -f
docker compose stop
docker compose start
docker compose down
```

## Inicio de sesión con Google

El flujo principal usa Google Identity Services: el frontend recibe un ID token y lo envía a:

```text
POST /api/auth/google/token
```

El backend valida ese token con `google-auth-library`, crea o vincula la cuenta como `COMPRADOR` y entrega los mismos JWT utilizados por el login normal.

Variables importantes:

```env
GOOGLE_CLIENT_ID=TU_CLIENT_ID.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=TU_CLIENT_SECRET
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
FRONTEND_URL=http://localhost:5173
OAUTH_STATE_SECRET=UNA_CLAVE_LARGA_Y_ALEATORIA
COOKIE_SECURE=false
```

En Google Cloud configura:

- Origen JavaScript autorizado: `http://localhost:5173`
- URI de redirección autorizado: `http://localhost:3000/api/auth/google/callback`

`GOOGLE_CLIENT_SECRET` solo es necesario para el flujo alternativo por redirección. El endpoint `GET /api/auth/google/config` mantiene sincronizado el Client ID entre frontend y backend.

## Categorías

Las categorías pertenecen únicamente a los productos y al filtrado del catálogo. Los vendedores no tienen categorías asignadas y pueden vender productos de cualquier categoría.

## Salud de servicios

```text
GET http://localhost:3000/health
GET http://localhost:3000/health/services
GET http://localhost:3000/api/auth/health/ready
```

## Usuarios de prueba

La contraseña inicial es `123456`:

- `admin@byteverse.com`
- `comprador@byteverse.com`
- `vendedor@byteverse.com` — solicita cambio de contraseña en el primer ingreso
