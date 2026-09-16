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

## Preparar otro computador Windows

Para probar la app en otro PC con Android por USB, el repositorio incluye un preparador. Instala Git, Docker Desktop y Android Studio mediante `winget`, descarga Flutter estable y abre Docker Desktop. No usa Atlas ni solicita las credenciales privadas de otra persona.

1. Descarga o clona este repositorio y el repositorio `obd-mobile-app`, usando las ramas de trabajo acordadas.
2. En PowerShell, dentro de `obd-platform`, ejecuta una sola vez:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\preparar-equipo-windows.ps1
```

3. Cuando Android Studio se abra por primera vez, conserva la instalación **Standard** para que instale el SDK de Android. Luego acepta las licencias con:

```powershell
C:\src\flutter\bin\flutter.bat doctor --android-licenses
```

4. Conecta el celular, activa **Depuración USB** y acepta la autorización que aparece en el teléfono.
5. Ejecuta la prueba local indicando la ruta del proyecto móvil:

```powershell
.\scripts\iniciar-pruebas-locales.ps1 -MobilePath "D:\RUTA\obd-mobile-app"
```

El primer uso requiere aceptar los términos de Docker y Android, y algunos celulares necesitan el controlador USB del fabricante. Después de esa preparación, para cada prueba solo hace falta abrir Docker Desktop, conectar el celular y ejecutar `iniciar-pruebas-locales.ps1`.

## Contratos de login

Se mantienen los contratos de auth que ya revisamos:

- `POST /api/v1/auth/google`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
