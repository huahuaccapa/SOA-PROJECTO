# ByteVerse Frontend

Frontend de comercio electrónico desarrollado con React 19, Vite 8 y Tailwind CSS 4.

## Puesta en marcha

```bash
npm install
npm run dev
```

Crea un archivo `.env` basado en `.env.example` y apunta las variables a tu backend.

## Inicio de sesión con Google

El botón **Continuar con Google** redirige a:

```text
{VITE_AUTH_URL}/auth/google
```

Después de autenticar al usuario, el backend debe redirigir a una de estas rutas del frontend:

```text
/auth/callback?accessToken=TOKEN&refreshToken=TOKEN&user=USUARIO_JSON_CODIFICADO&state=STATE
/login?token=TOKEN&user=USUARIO_JSON_CODIFICADO
```

El objeto `user` debe incluir, como mínimo, `nombre`, `email` y `role`. Los roles reconocidos son `COMPRADOR`, `VENDEDOR` y `ADMIN`.

En Google Cloud Console registra en el cliente OAuth la URL de callback que utiliza tu backend. El backend es quien intercambia el código de Google y finalmente redirige al frontend; las credenciales secretas de Google nunca deben guardarse en Vite.

## Comandos

- `npm run dev`: servidor de desarrollo.
- `npm run build`: compilación de producción.
- `npm run preview`: previsualización del build.
