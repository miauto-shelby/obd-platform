# Diagramas de flujo de rutas

## Propósito

Este documento muestra, de forma visual y editable, qué ocurre cuando una aplicación consume cada ruta disponible. Es la referencia de comunicación entre la aplicación móvil, el backend y la base de datos.

Los diagramas están escritos con **Mermaid**, por lo que GitHub los muestra como diagramas y cualquier integrante puede actualizar el texto directamente en este archivo. No son imágenes fijas.

**Última actualización:** 14 de octubre de 2026.

## Cómo mantenerlo actualizado

Cuando se cree o cambie una ruta:

1. Actualizar su contrato en `../../openapi/openapi.yaml`.
2. Agregar o ajustar su diagrama en este archivo.
3. Actualizar la aplicación que consume la ruta.
4. Agregar o actualizar pruebas.

La regla es: una ruta nueva no se considera terminada si no tiene contrato, diagrama y prueba.

## Mapa de rutas actual

| Área | Ruta | Estado | Diagrama |
| --- | --- | --- | --- |
| Disponibilidad | `GET /health` | Disponible | [Ver flujo](#1-comprobar-el-servicio) |
| Autenticación | `POST /api/v1/auth/google` | Disponible | [Ver flujo](#2-iniciar-sesión-con-google) |
| Autenticación | `POST /api/v1/auth/refresh` | Disponible | [Ver flujo](#3-renovar-la-sesión) |
| Autenticación | `POST /api/v1/auth/logout` | Disponible | [Ver flujo](#4-cerrar-sesión) |
| Autenticación | `GET /api/v1/auth/me` | Disponible | [Ver flujo](#5-consultar-el-perfil-autenticado) |
| Vehículos | `POST /api/v1/vehicles` | Disponible | [Ver flujo](#6-registrar-un-vehículo) |
| Vehículos | `GET /api/v1/vehicles` | Disponible | [Ver flujo](#7-listar-los-vehículos-de-la-cuenta) |
| Vehículos | `GET /api/v1/vehicles/{vehicleId}` | Disponible | [Ver flujo](#8-consultar-un-vehículo) |
| Vehículos | `PATCH /api/v1/vehicles/{vehicleId}` | Disponible | [Ver flujo](#9-actualizar-información-básica-del-vehículo) |
| Vehículos | `PATCH /api/v1/vehicles/{vehicleId}/vin` | Disponible | [Ver flujo](#10-registrar-el-vin-una-sola-vez) |
| Administración | `PATCH /api/v1/admin/vehicles/{vehicleId}/plate` | Disponible | [Ver flujo](#11-correcciones-administrativas-de-placa-o-vin) |
| Administración | `PATCH /api/v1/admin/vehicles/{vehicleId}/vin` | Disponible | [Ver flujo](#11-correcciones-administrativas-de-placa-o-vin) |
| Vehículos | `DELETE /api/v1/vehicles/{vehicleId}` | Disponible | [Ver flujo](#12-retirar-un-vehículo-de-la-lista) |
| Vehículos | `GET /api/v1/vehicles/active` | Disponible | [Ver flujo](#13-consultar-el-vehículo-activo) |
| Vehículos | `PUT /api/v1/vehicles/active` | Disponible | [Ver flujo](#14-cambiar-el-vehículo-activo) |

> Nota para arquitectura: las cuatro rutas de autenticación se encuentran implementadas en el backend y descritas en `03-auth-service.md`. Su incorporación completa a `../../openapi/openapi.yaml` queda como tarea de sincronización documental.

---

## 1. Comprobar el servicio

```mermaid
flowchart TD
    A[Aplicación o herramienta] -->|GET /health| B[Backend]
    B --> C{¿El servicio está en ejecución?}
    C -->|Sí| D[200: estado ok]
    C -->|No| E[No hay respuesta: revisar servidor o red]
```

## 2. Iniciar sesión con Google

```mermaid
flowchart TD
    A[Aplicación móvil] -->|Usuario elige Google| B[Google entrega idToken]
    B --> C[POST /api/v1/auth/google]
    C --> D[Backend valida token con Google]
    D --> E{¿Token válido?}
    E -->|No| F[401: token de Google inválido]
    E -->|Sí| G[Buscar o crear usuario]
    G --> H[Crear sesión y tokens propios]
    H --> I[(MongoDB)]
    I --> J[200: usuario + accessToken + refreshToken]
    J --> K[Aplicación guarda la sesión de forma segura]
```

## 3. Renovar la sesión

```mermaid
flowchart TD
    A[Aplicación con sesión próxima a vencer] --> B[POST /api/v1/auth/refresh]
    B --> C[Backend recibe refreshToken]
    C --> D[(MongoDB: buscar sesión)]
    D --> E{¿Sesión válida y activa?}
    E -->|No| F[401: sesión inválida, vencida o reutilizada]
    E -->|Sí| G[Rotar refreshToken y crear nuevo accessToken]
    G --> H[(MongoDB: guardar nueva sesión)]
    H --> I[200: nuevos tokens]
    I --> J[Aplicación reemplaza la sesión guardada]
```

## 4. Cerrar sesión

```mermaid
flowchart TD
    A[Usuario elige cerrar sesión] --> B[POST /api/v1/auth/logout + accessToken]
    B --> C[Backend valida accessToken]
    C --> D{¿Token y sesión válidos?}
    D -->|No| E[401: sesión no válida]
    D -->|Sí| F[(MongoDB: marcar sesión como cerrada)]
    F --> G[200: sesión cerrada correctamente]
    G --> H[Aplicación elimina la sesión local]
    H --> I[Mostrar inicio de sesión]
```

## 5. Consultar el perfil autenticado

```mermaid
flowchart TD
    A[Aplicación] --> B[GET /api/v1/auth/me + accessToken]
    B --> C[Backend valida token]
    C --> D{¿Sesión válida?}
    D -->|No| E[401: volver al inicio de sesión]
    D -->|Sí| F[(MongoDB: consultar usuario)]
    F --> G[200: nombre, correo y foto]
    G --> H[Aplicación muestra el perfil]
```

## 6. Registrar un vehículo

```mermaid
flowchart TD
    A[Usuario completa datos básicos] --> B[POST /api/v1/vehicles + accessToken]
    B --> C[Backend valida sesión]
    C --> D{¿Sesión válida?}
    D -->|No| E[401: volver al inicio de sesión]
    D -->|Sí| F[Validar placa, marca, modelo y año]
    F --> G{¿Datos válidos y placa disponible?}
    G -->|No| H[400 o 409: explicar el dato a corregir]
    G -->|Sí| I[Asignar kilometraje pendiente de lectura OBD2]
    I --> J[(MongoDB: guardar vehículo)]
    J --> K[201: vehículo creado]
    K --> L[Aplicación actualiza la lista]
```

## 7. Listar los vehículos de la cuenta

```mermaid
flowchart TD
    A[Aplicación abre Mis vehículos] --> B[GET /api/v1/vehicles + accessToken]
    B --> C[Backend valida sesión]
    C --> D{¿Sesión válida?}
    D -->|No| E[401: volver al inicio de sesión]
    D -->|Sí| F[(MongoDB: vehículos del usuario)]
    F --> G[200: lista de vehículos]
    G --> H[Aplicación muestra solo los vehículos propios]
```

## 8. Consultar un vehículo

```mermaid
flowchart TD
    A[Usuario toca un vehículo] --> B[GET detalle del vehículo + accessToken]
    B --> C[Backend valida sesión]
    C --> D[(MongoDB: buscar vehículo y propietario)]
    D --> E{¿Existe y pertenece a la cuenta?}
    E -->|No| F[404: vehículo no encontrado]
    E -->|Sí| G[200: detalle del vehículo]
    G --> H[Aplicación muestra el detalle]
```

## 9. Actualizar información básica del vehículo

```mermaid
flowchart TD
    A[Usuario edita datos básicos] --> B[PATCH datos básicos del vehículo + accessToken]
    B --> C[Backend valida sesión y propiedad]
    C --> D{¿Vehículo propio?}
    D -->|No| E[404: vehículo no encontrado]
    D -->|Sí| F[Validar nombre, marca, modelo y características]
    F --> G{¿Datos permitidos?}
    G -->|No| H[400: explicar el dato a corregir]
    G -->|Sí| I[(MongoDB: actualizar perfil del vehículo)]
    I --> J[200: vehículo actualizado]
    J --> K[Aplicación refresca el detalle]
```

## 10. Registrar el VIN una sola vez

```mermaid
flowchart TD
    A[Usuario registra VIN] --> B[PATCH VIN del vehículo + accessToken]
    B --> C[Backend valida sesión y propiedad]
    C --> D{¿Vehículo propio?}
    D -->|No| E[404: vehículo no encontrado]
    D -->|Sí| F{¿El vehículo aún tiene VIN pendiente?}
    F -->|No| G[409: corrección requiere administrador]
    F -->|Sí| H{¿VIN válido de 17 caracteres?}
    H -->|No| I[400: VIN inválido]
    H -->|Sí| J[(MongoDB: guardar VIN una única vez)]
    J --> K[200: vehículo actualizado]
    K --> L[Aplicación bloquea edición normal]
```

## 11. Correcciones administrativas de placa o VIN

### Placa

```mermaid
flowchart TD
    A[Administrador reporta corrección] --> B[PATCH placa del vehículo como administrador]
    B --> C[Backend valida sesión]
    C --> D{¿Usuario tiene rol persistente ADMIN?}
    D -->|No| E[403: acceso administrativo requerido]
    D -->|Sí| F[Validar nueva placa y motivo]
    F --> G{¿Placa válida, diferente y disponible globalmente?}
    G -->|No| H[400 o 409: explicar corrección requerida]
    G -->|Sí| I[(MongoDB: actualizar placa y guardar auditoría)]
    I --> J[200: vehículo actualizado]
    J --> K[Historial conserva placa anterior, motivo y responsable]
```

### VIN

```mermaid
flowchart TD
    A[Administrador reporta corrección de VIN] --> B[PATCH VIN administrativo + accessToken]
    B --> C[Backend valida sesión]
    C --> D{¿Usuario tiene rol persistente ADMIN?}
    D -->|No| E[403: acceso administrativo requerido]
    D -->|Sí| F[Validar nuevo VIN y motivo]
    F --> G{¿VIN válido, diferente y disponible globalmente?}
    G -->|No| H[400 o 409: explicar corrección requerida]
    G -->|Sí| I[(MongoDB: actualizar VIN y guardar auditoría)]
    I --> J[200: vehículo actualizado]
    J --> K[Historial conserva VIN anterior, motivo y responsable]
```

## 12. Retirar un vehículo de la lista

```mermaid
flowchart TD
    A[Usuario elige retirar un vehículo] --> B[DELETE vehículo + accessToken]
    B --> C[Backend valida sesión y propiedad]
    C --> D{¿Vehículo propio y activo?}
    D -->|No| E[404: vehículo no encontrado]
    D -->|Sí| F{¿Tiene sesión OBD2 activa?}
    F -->|Sí| G[409: terminar la sesión OBD2 primero]
    F -->|No| H[(MongoDB: marcar vehículo inactivo)]
    H --> I[204: retiro confirmado sin borrar historial]
    I --> J{¿Era el vehículo activo?}
    J -->|Sí| K[La próxima consulta usa otro vehículo disponible]
    J -->|No| L[La selección actual se conserva]
```

## 13. Consultar el vehículo activo

```mermaid
flowchart TD
    A[Aplicación abre el inicio] --> B[GET vehículo activo + accessToken]
    B --> C[Backend valida sesión]
    C --> D{¿Sesión válida?}
    D -->|No| E[401: volver al inicio de sesión]
    D -->|Sí| F[(MongoDB: buscar último vehículo activo)]
    F --> G{¿Existe un vehículo activo?}
    G -->|No| H[404: mostrar opción para agregar o elegir vehículo]
    G -->|Sí| I[200: detalle del vehículo activo]
    I --> J[Aplicación muestra placa, datos y kilometraje disponible]
```

## 14. Cambiar el vehículo activo

```mermaid
flowchart TD
    A[Usuario toca Cambiar vehículo] --> B[Aplicación lista vehículos propios]
    B --> C[Usuario elige un vehículo]
    C --> D[PUT vehículo activo + accessToken]
    D --> E[Backend valida sesión y propiedad]
    E --> F{¿Vehículo propio y activo?}
    F -->|No| G[404: informar que no está disponible]
    F -->|Sí| H[(MongoDB: guardar última selección)]
    H --> I[200: vehículo activo actualizado]
    I --> J[Aplicación refresca la pantalla principal]
```

## Próximo diagrama: lecturas OBD2

La siguiente ruta que se agregue para OBD2 deberá incluir su diagrama en esta sección. Antes de definirla se necesita confirmar el adaptador, el tipo de conexión compatible con iPhone y Android, y los datos exactos que puede entregar.
