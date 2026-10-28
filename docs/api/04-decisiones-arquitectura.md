                 API Gateway
                      │
        ┌─────────────┴─────────────┐
        │                           │
        ▼                           ▼

Auth Service------------------- User Service
│ ---------------------------│
│--------------------------- │
Login Google ----------------------Perfil
JWT ----------------------------Preferencias
Refresh -----------------------Token Configuración
Logout ----------------------------Idioma
Sesiones ------------------------Notificaciones

**login**

                Login
                  │
                  ▼
         Google devuelve idToken
                  │
                  ▼
      POST /api/v1/auth/google
                  │
                  ▼
      Auth Service valida con Google
                  │
                  ▼

Genera Access Token + Refresh Token
│
▼
App guarda ambos tokens
│
┌───────────┴───────────┐
│ │
▼ ▼
Consume APIs Access Token expira
│ │
│ ▼
│ POST /auth/refresh
│ │
└──────────────► Nuevo Access Token B

Cuando el usuario sale:

        POST /api/v1/auth/logout
                │
                ▼
        Backend invalida Refresh Token
                │
                ▼
        App elimina ambos tokens

**Para que el refresh token :**

Usuario
│
├── Celular Juan
│ Refresh Token A
│
├── Tablet
│ Refresh Token B
│
└── Celular nuevo
Refresh Token C

              Login
                │
                ▼
        Google valida usuario
                │
                ▼
          Access Token A
         Refresh Token A
                │
                ▼
       Access Token expira
                │
                ▼
        POST /auth/refresh
         (refreshToken A)
                │
                ▼
          Access Token B
         Refresh Token B
                │
                ▼

Refresh Token A queda inválido

**¿Por qué existe /me?**

Porque la aplicación, al iniciar, normalmente hace:

                    Abrir App
                        │
                        ▼
                ¿Tengo Access Token?
                        │
                        ▼
                        Sí
                        │
                        ▼
                 GET /auth/me
                        │
                        ▼
        Obtiene la información del usuario

**Tema**

Identificador del usuario.

**Decisión**

Se utilizará UUID como identificador único para todos los usuarios.

**Justificación**

- Compatible con microservicios.
- Evita conflictos entre bases de datos.
- No expone la cantidad de usuarios registrados.
- Facilita futuras integraciones.

**Estado**

✅ Aprobada.

## ADR-002

**Tema**

Creación automática de usuarios.

**Decisión**

Cuando un usuario inicie sesión con Google por primera vez y no exista en la base de datos, el sistema lo creará automáticamente.

**Justificación**

- Mejora la experiencia del usuario.
- Evita un proceso adicional de registro.
- Sigue el comportamiento esperado en aplicaciones modernas.

**Estado**

✅ Aprobada.

## ADR-003

**Tema**

Vinculación de cuentas.

**Decisión**

No se vincularán automáticamente cuentas existentes que tengan el mismo correo electrónico.

La vinculación será un proceso explícito en una futura versión.

**Justificación**

- Evita problemas de seguridad.
- Permite soportar múltiples proveedores de autenticación.
- Mantiene el control por parte del usuario.

**Estado**

✅ Aprobada.

## ADR-004

**Tema**

Manejo del Logout.

**Decisión**

El endpoint POST /auth/logout sí existirá.

**Comportamiento**

- El frontend llamará al backend.
- El backend invalidará el Refresh Token.
- Registrará la auditoría del cierre de sesión.
- El frontend eliminará el Access Token y el Refresh Token del almacenamiento seguro.

## ADR-005

**Tema**

Estructura estándar de errores

**Decisión**

Todos los microservicios devolverán exactamente el mismo formato de error.

**Justificación**

- Facilita la integración con otros sistemas.
- Evita errores de tipo "500".

**Estado**

✅ Aprobada.

## ADR-006

**Tema**

Códigos de error.

**Decisión**

Todos los errores de negocio utilizarán códigos alfanuméricos descriptivos.

**Ejemplos**

- INVALID_GOOGLE_TOKEN
- VALIDATION_ERROR
- REFRESH_TOKEN_EXPIRED
- REFRESH_TOKEN_REVOKED
- USER_ALREADY_EXISTS
- INTERNAL_ERROR

**Justificación**

- Son fáciles de entender.
- No requieren consultar una tabla.
- Facilitan la lectura de logs.
- Mejoran el desarrollo del frontend.

## ADR-007

**Tema**
Gestión de sesiones y dispositivos

**Decicsion**

- Un mismo usuario puede instalar la aplicación en varios dispositivos móviles (Android o iOS).
- Cada dispositivo podrá iniciar sesión utilizando la misma cuenta de Google.
- Las lecturas del OBD2 deben permanecer disponibles para el usuario independientemente del dispositivo desde el cual fueron capturadas.

**Justificación**

- Permite que un usuario utilice varios dispositivos sin interferencias.
- Aumenta la seguridad al utilizar Refresh Token Rotation.
- Evita cerrar sesiones activas innecesariamente.

**Estado**

✅ Aprobada.

## ADR-008

**Tema**

Identificación única de dispositivos

**Decicsion**

- Un usuario puede iniciar sesión desde varios dispositivos Android o iOS.
- El sistema debe poder administrar las sesiones de manera independiente para cada dispositivo.

**Justificación**

- Cada instalación de la aplicación generará un deviceId (UUID) único la primera vez que se ejecute.
- Ese deviceId será enviado al Auth Service durante el login y en las operaciones relacionadas con la sesión.
- El deviceId permanecerá igual mientras la aplicación esté instalada.

**Estado**

✅ Aprobada.

## ADR-009

**Tema**

Propiedad del kilometraje

El sistema recibe lecturas de kilometraje desde el dispositivo OBDII.

**Decicsion**

- El Vehicle Service será el propietario del kilometraje del vehículo.
- Mantendrá el valor actual (currentMileage).
- También almacenará el historial de kilometraje (MileageHistory) para soportar mantenimientos, notificaciones y gráficas.
- El OBD Service solo obtiene la lectura y la envía al backend.

**Justificación**

- Existe una única fuente de verdad para el kilometraje actual.
- Se evita duplicar el mismo dato en varios microservicios.
- El sistema puede evolucionar para almacenar historial sin afectar los contratos existentes.

**Estado**

✅ Aprobada.

# ADR-010 Selección del vehículo activo

**Tema**
Un usuario puede registrar uno o varios vehículos en la aplicación.

**Decisión**

- Si el usuario tiene un solo vehículo, la aplicación lo seleccionará automáticamente.
- Si tiene varios vehículos, la aplicación recordará el último vehículo utilizado.
- El usuario podrá cambiar el vehículo activo en cualquier momento.
- No se devolverá el VIN en la consulta de listado.

**Justificación**

- Mejora la experiencia de usuario.
- Reduce la cantidad de pasos al ingresar a la aplicación.
- Facilita la conexión con el dispositivo OBDII.

**Estado**

✅ Aprobada.

# ADR-011 – Registro de vehículos mediante VIN

**Tema**

- El sistema debe poder registrar un vehículo mediante su VIN.
- Durante el registro de un vehículo, la aplicación necesita obtener información como marca, modelo, año, motor y tipo de combustible.

**Decisión**

- El sistema intentará consultar automáticamente la información del vehículo utilizando el VIN.
- Si la consulta no devuelve resultados o la información es incompleta, el usuario podrá ingresar manualmente los datos faltantes.

**Justificación**

- Reduce el tiempo de registro.
- Disminuye errores de digitación.
- Permite registrar vehículos aunque no exista información disponible.

**Consecuencias**

- El Vehicle Service deberá integrarse con un proveedor de información vehicular (cuando esté disponible).
- La aplicación deberá permitir la edición manual de los campos.

**Estado**

✅ Aprobada.

# ADR-013 – Origen del kilometraje

**Tema**

El kilometraje es la base para calcular mantenimientos, alertas y estadísticas.

**Decisión**

- El usuario no podrá ingresar manualmente el kilometraje al registrar un vehículo.
- El kilometraje inicial y sus actualizaciones solo podrán provenir de una lectura válida del dispositivo OBDII.

**Justificación**

- Evita errores de digitación.
- Evita manipulación intencional del kilometraje.
- Garantiza que las alertas y mantenimientos se basen en datos confiables.

**Consecuencias**

- Un vehículo recién registrado no tendrá kilometraje hasta su primera conexión con el OBDII.
- El OBD Service será la única fuente autorizada para actualizar el kilometraje.
- El Vehicle Service seguirá siendo el propietario del dato y almacenará el valor actual y su historial.

**Estado**

✅ Aprobada.

# ADR-014 – Modificación del VIN

**Decisión:**

- El usuario puede registrar el VIN una sola vez, únicamente mientras el vehículo tenga el campo pendiente.
- Una vez registrado, el propietario no puede borrarlo ni reemplazarlo, incluso antes de recibir lecturas OBD.
- Una corrección posterior requiere un administrador, un motivo obligatorio y una auditoría con VIN anterior, VIN nuevo, fecha y responsable.

**Justificación:**

- Protege la identidad técnica del vehículo desde el primer registro y evita que cambios posteriores mezclen datos, diagnósticos, mantenimientos o lecturas OBD de vehículos distintos.

**Estado:**

✅ Aprobada.

# ADR-015 – Campos editables del vehículo

**Tema**

Los campos del vehículo que se pueden editar por el usuario.

**Decisión**

- nickname
- plate

**Justificación**

- Evita manipulación intencional del vehículo.
- Evitar romper el historial de diagnósticos y mantenimientos.

**Estado**

✅ Aprobada.

# ADR-016 – Eliminación de vehículos

**Tema**

Permitir eliminar un vehículo.

**contexto**

- El Vehicle Service permite la eliminación lógica de vehículos.
- Sin embargo, un vehículo puede tener una sesión OBDII activa mientras se están realizando lecturas, diagnósticos o captura de datos.
- También pueden presentarse fallos de comunicación, pérdida de conexión Bluetooth o errores del OBD Service que dejen una sesión abierta de forma incorrecta.

**Decisión**

Un vehículo no podrá eliminarse mientras tenga una sesión OBD activa.

El OBD Service deberá garantizar el cierre de las sesiones mediante alguno de los siguientes mecanismos:

- Cierre normal de la sesión por parte del usuario.
- Cierre automático por inactividad (timeout).
- Cierre por detección de error de comunicación.
- Cierre administrativo (Force Close) realizado por un usuario con permisos de administrador.

**Justificación**

- Evita eliminar un vehículo mientras existen operaciones en ejecución.
- Protege la integridad de las lecturas y diagnósticos.
- Permite recuperar sesiones bloqueadas sin afectar al usuario.
- Evita que un error técnico impida administrar el vehículo.

**Estado**

✅ Aprobada.
