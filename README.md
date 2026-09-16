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

## Pruebas locales aisladas con Docker

Este modo crea un backend y MongoDB local para pruebas. No usa Atlas, no lee el archivo `.env` habitual y no toca la base de datos de desarrollo actual. Docker publica el backend en `127.0.0.1:8081` para no interferir con el backend habitual en el puerto `8080`.

1. Instala Docker Desktop, Flutter y Android Platform Tools en el equipo de pruebas.
2. Copia `.env.docker.example` como `.env.docker`. Ese archivo es solo local y no se sube al repositorio.
3. Conecta el celular Android por USB y autoriza la depuración.
4. Ejecuta desde PowerShell:

```powershell
.\scripts\iniciar-pruebas-locales.ps1 -MobilePath "D:\OBD2-MOBILE\obd-mobile-app"
```

El script inicia `api` y `mongo` en Docker, comprueba `GET /health`, configura `adb reverse tcp:8081 tcp:8081` y abre Flutter en el celular con `API_BASE_URL=http://127.0.0.1:8081`.

Para detener el entorno local sin afectar el volumen de datos:

```powershell
docker compose -f compose.local.yaml down
```

Para borrar únicamente los datos locales de prueba, sin tocar Atlas:

```powershell
docker compose -f compose.local.yaml down --volumes
```

## Contratos de login

Se mantienen los contratos de auth que ya revisamos:

- `POST /api/v1/auth/google`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
