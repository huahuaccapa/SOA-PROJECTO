# ByteVerse Backend

Backend compuesto por un API Gateway, MongoDB, RabbitMQ, Redis y microservicios Node.js/Python.

## Configuración

1. Copia `.env.example` como `.env`.
2. Completa `GOOGLE_CLIENT_SECRET` con el secreto del mismo cliente OAuth cuyo ID ya está configurado.
3. Cambia `OAUTH_STATE_SECRET` por una cadena larga y aleatoria.
4. Ejecuta:

```bash
npm start
```

La API queda disponible en `http://localhost:3000`.

## Google OAuth

En Google Cloud Console, dentro del cliente OAuth, registra exactamente este URI de redirección autorizado:

```text
http://localhost:3000/api/auth/google/callback
```

Para producción usa HTTPS y actualiza `FRONTEND_URL`, `GOOGLE_CALLBACK_URL` y `COOKIE_SECURE=true`.

El flujo implementado es:

```text
Frontend → GET /api/auth/google → Google → /api/auth/google/callback → Frontend /auth/callback
```

El backend crea o vincula una cuenta `COMPRADOR`, emite los mismos JWT del login tradicional y conserva los contratos de `login`, `register`, `refresh-token`, `verify`, `change-password` y `logout`.

También está disponible `POST /api/auth/google/token` para clientes que usen Google Identity Services y envíen un ID token en `credential`.

## Estabilidad

- MongoDB y RabbitMQ tienen comprobaciones de salud antes de iniciar servicios dependientes.
- RabbitMQ usa conexiones con heartbeat y credenciales configurables sin romper los datos existentes.
- Los consumidores Node reconectan automáticamente si RabbitMQ se reinicia.
- Auth Service reintenta MongoDB y RabbitMQ con espera progresiva.
- API Gateway aplica timeouts, devuelve `503` cuando un servicio está temporalmente fuera y no expone errores internos.
- Auth Service y Gateway realizan apagado controlado y Docker los reinicia con `restart: unless-stopped`.

Comandos útiles:

```bash
npm run status
npm run health
npm run logs
npm run stop
```

El estado agregado está en `GET /health/services`; el estado del Auth Service está en `/api/auth/health`, `/api/auth/health/live` y `/api/auth/health/ready`.
