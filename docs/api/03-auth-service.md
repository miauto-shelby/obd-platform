# Arquitectura del Proyecto

# Auth Service

## Objetivo

Permitir que un usuario se autentique mediante Google y que el backend genere un JWT para acceder a los demás microservicios.

---

# Contratos

| Método | Endpoint             | Descripción                                 |
| ------ | -------------------- | ------------------------------------------- |
| POST   | /api/v1/auth/google  | Iniciar sesión con Google                   |
| POST   | /api/v1/auth/refresh | Renovar el JWT                              |
| POST   | /api/v1/auth/logout  | Cerrar sesión                               |
| GET    | /api/v1/auth/me      | Obtener información del usuario autenticado |

---

# Endpoint: POST /api/v1/auth/google

## Objetivo

Recibir el idToken generado por Google, validarlo y devolver un JWT propio.

## Request

```json
{
  "idToken": "...",
  "deviceId": "...",
  "deviceName": "...",
  "platform": "ANDROID",
  "appVersion": "1.0.0"
}
```

## Response 200

```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "expiresIn": 3600,
  "tokenType": "Bearer",
  "user": {
    "id": "c8d2f4c1-3f8e-4b72-9d4d-1d3c1d8a8e11",
    "name": "Juan",
    "lastName": "Fajardo",
    "email": "juan@gmail.com",
    "photoUrl": "https://..."
  }
}
```

## Response 401

```json
{
  "code": "INVALID_GOOGLE_TOKEN",
  "message": "El token de Google no es válido."
}
```

## Response 500

```json
{
  "code": "INTERNAL_ERROR",
  "message": "Ocurrió un error interno."
}
```

## Errores

| HTTP | Código                 | Descripción                                             |
| ---- | ---------------------- | ------------------------------------------------------- |
| 400  | `VALIDATION_ERROR`     | La solicitud contiene datos inválidos o faltantes.      |
| 401  | `INVALID_GOOGLE_TOKEN` | El idToken de Google no es válido.                      |
| 401  | `GOOGLE_TOKEN_EXPIRED` | El idToken de Google expiró.                            |
| 403  | `USER_DISABLED `       | El usuario se encuentra deshabilitado en la aplicación. |
| 500  | `INTERNAL_ERROR `      | Error interno del servidor.                             |

## Endpoint: POST /api/v1/auth/refresh

## Request

```json
{
  "refreshToken": "...",
  "appVersion": "1.1.0"
}
```

## Response 200

```json
{
  "accessToken": "eyJhbGciOi...",
  "refreshToken": "eyJhbGciOi...",
  "tokenType": "Bearer",
  "expiresIn": 3600
}
```

## Errores

| HTTP | Código                  | Descripción                                       |
| ---- | ----------------------- | ------------------------------------------------- |
| 400  | `VALIDATION_ERROR`      | La solicitud es inválida.                         |
| 401  | `REFRESH_TOKEN_INVALID` | El token no existe o fue alterado.                |
| 401  | `REFRESH_TOKEN_EXPIRED` | El Refresh Token expiró.                          |
| 401  | `REFRESH_TOKEN_REUSED`  | Se intentó reutilizar un Refresh Token ya rotado. |
| 500  | `INTERNAL_ERROR`        | Error interno del servidor.                       |

## Endpoint: POST /api/v1/auth/logout

## Request

POST /api/v1/auth/logout

## Response 200

```json
{
  "message": "Sesión cerrada correctamente."
}
```

## Errores

| HTTP | Código                  |
| ---- | ----------------------- |
| 401  | `INVALID_ACCESS_TOKEN ` |
| 401  | `SESSION_NOT_FOUND `    |
| 500  | `INTERNAL_ERROR`        |

# Endpoint: POST /api/v1/auth/logout

## Request

POST /api/v1/auth/logout

## Response 200

```json
{
  "message": "Sesión cerrada correctamente."
}
```

## Errores

| HTTP | Código                 | Descripción                                      |
| ---- | ---------------------- | ------------------------------------------------ |
| 401  | `INVALID_ACCESS_TOKEN` | El Access Token no es válido.                    |
| 401  | `TOKEN_EXPIRED`        | El Access Token ha expirado.                     |
| 401  | `SESSION_NOT_FOUND`    | No existe una sesión activa para el dispositivo. |
| 500  | `INTERNAL_ERROR`       | Error interno del servidor.                      |

# Endpoint: GET /api/v1/auth/me

## Request

GET /api/v1/auth/me

## Response 200

```json
{
  "id": "c8d2f4c1-3f8e-4b72-9d4d-1d3c1d8a8e11",
  "firstName": "Sebastián",
  "lastName": "Fajardo",
  "email": "sebastian@gmail.com",
  "photoUrl": "https://..."
}
```

## Errores

| HTTP | Código                 |
| ---- | ---------------------- |
| 401  | `INVALID_ACCESS_TOKEN` |
| 401  | `TOKEN_EXPIRED `       |
| 500  | `INTERNAL_ERROR`       |
