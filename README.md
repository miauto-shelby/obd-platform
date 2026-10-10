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
- `GET /api/v1/vehicles/active`
- `PUT /api/v1/vehicles/active`
- `GET /api/v1/vehicles/:vehicleId`
- `PATCH /api/v1/vehicles/:vehicleId`
- `PATCH /api/v1/vehicles/:vehicleId/vin`
- `DELETE /api/v1/vehicles/:vehicleId` (desactivación lógica)
- `PATCH /api/v1/admin/vehicles/:vehicleId/plate` (administrador; corrección auditada)
- `GET /health`

## Corrección administrativa de placa

La placa y el VIN —cuando este último exista— son únicos en toda la plataforma. Los usuarios normales no pueden modificar la placa. Cuando una persona registra una placa por error, solo un administrador puede corregirla.

1. En el `.env` local del backend, define los correos autorizados, separados por coma:

```text
ADMIN_EMAILS=admin@ejemplo.com,otro-admin@ejemplo.com
```

2. El administrador debe iniciar sesión normalmente y usar un access token válido.
3. Enviar `PATCH /api/v1/admin/vehicles/{vehicleId}/plate` con este cuerpo:

```json
{
  "plate": "ABC123",
  "reason": "Corrección de error de digitación informado por el usuario."
}
```

La corrección deja un registro interno con la placa anterior, nueva placa, motivo, fecha y administrador responsable. Una placa ya registrada genera `409`; un usuario que no sea administrador recibe `403`.

Al iniciar, el backend verifica que no existan placas ni VIN duplicados antes de activar las reglas globales. Si encuentra una duplicidad antigua, se detiene sin borrar ni modificar datos y muestra los identificadores que debe revisar un administrador.

Para generar un token temporal de administrador dentro del entorno Docker local, agrega también `POSTMAN_TEST_MODE=true` y el correo en `ADMIN_EMAILS` al archivo `.env.docker`, luego ejecuta:

```powershell
docker compose -f compose.local.yaml exec api node scripts/create-postman-test-token.js admin@ejemplo.com
```

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

## Prueba local en iPhone desde una Mac

La guía para levantar Docker y ejecutar Flutter en un iPhone físico está en el repositorio móvil, en `docs/pruebas-ios-mac.md`. Para Android, este repositorio mantiene el puerto limitado a `127.0.0.1` y usa `adb reverse`. Para una prueba temporal en iPhone, la Mac y el iPhone deben compartir Wi-Fi y Docker debe exponerse únicamente durante la prueba:

```bash
API_HOST_BINDING=0.0.0.0 docker compose --env-file .env.docker -f compose.local.yaml up --build --detach
```

El valor por defecto sigue siendo `127.0.0.1`, por lo que no cambia el comportamiento habitual de Android.

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

## Token temporal para pruebas con Postman

Las rutas de vehículos requieren una sesión válida. Para validar esas rutas sin exponer un token de la aplicación, cada desarrollador puede generar una sesión local de una hora. El comando no abre un endpoint nuevo, no sube secretos al repositorio y muestra el token únicamente en la consola local.

1. Inicia sesión una vez en la app con el correo de pruebas. Esto crea ese usuario en la base de datos configurada en `.env`.
2. Agrega temporalmente esta línea a tu `.env` local, sin subirla a Git:

```text
POSTMAN_TEST_MODE=true
```

3. Desde la carpeta del backend ejecuta, reemplazando el correo por el tuyo:

```powershell
npm run postman:token -- tu-correo@ejemplo.com
```

4. Copia el valor completo que muestra la consola y pégalo en la variable `accessToken` de la colección de Postman. No compartas, guardes en capturas ni subas ese valor: vence en una hora.

Si el correo todavía no existe, el comando se detiene sin crear nada y te indica iniciar sesión primero en la app.
