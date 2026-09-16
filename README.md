# OBD2 Platform Backend

Backend Node para la app móvil de OBD2.

## Run

1. Copia `.env.example` como `.env` y configura `MONGODB_URI`, `MONGODB_DATABASE` y `JWT_SECRET`.
2. Instala las dependencias y arranca el backend:

```bash
npm install
npm start
```

El backend no inicia sin `MONGODB_URI`; así evitamos volver a operar con usuarios y sesiones efímeros por accidente.

MongoDB guarda `users` y `sessions`. Las sesiones expiran automáticamente cuando vence el refresh token; solo se guarda el hash SHA-256 del refresh token, nunca el token completo.

El servidor queda por defecto en:

```text
http://localhost:8080
```

## Endpoints

- `POST /api/v1/auth/google`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- `POST /api/v1/vehicles`
- `GET /api/v1/vehicles`
- `GET /health`

## Prueba desde celular por USB

Si el celular Android está conectado por USB y quieres que la app llegue al backend local de tu PC, usa:

```bash
adb reverse tcp:8080 tcp:8080
```

Luego apunta la app a:

```text
http://127.0.0.1:8080
```

## Contratos de login

Se mantienen los contratos de auth que ya revisamos:

- `POST /api/v1/auth/google`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
