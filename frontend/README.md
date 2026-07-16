# ByteVerse Frontend

Frontend de comercio electrónico desarrollado con React, Vite y Tailwind CSS.

## Inicio rápido

```bash
npm install
npm run dev
```

La aplicación se abre en `http://localhost:5173` y consume el API Gateway mediante:

```env
VITE_API_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
```

## Inicio de sesión con Google

El botón oficial de Google Identity Services es el flujo principal. El frontend consulta `GET /api/auth/google/config` para utilizar exactamente el mismo Client ID del backend y envía el ID token a `POST /api/auth/google/token`.

Configura el mismo Client ID en `.env`:

```env
VITE_GOOGLE_LOGIN_MODE=auto
VITE_GOOGLE_CLIENT_ID=TU_CLIENT_ID.apps.googleusercontent.com
```

En Google Cloud agrega `http://localhost:5173` como origen JavaScript autorizado. Para el flujo alternativo por redirección agrega también `http://localhost:3000/api/auth/google/callback` como URI autorizado.

## Vendedores y categorías

La administración de vendedores ya no permite asignar categorías. Cualquier vendedor puede vender productos de cualquier categoría; las categorías se mantienen exclusivamente en productos y búsquedas del catálogo.

## Compilación

```bash
npm run build
npm run preview
```
