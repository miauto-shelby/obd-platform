# Pruebas manuales de vehículos con Postman

## Preparación

1. Iniciar el backend con `npm run dev` desde `D:\OBD2-PLATAFORM`.
2. Importar `postman/My-Auto-Vehicle-Validation.postman_collection.json` en Postman.
3. Confirmar primero que `01 - Estado del backend` responda `200` con `{ "status": "ok" }`.
4. Generar un `accessToken` temporal desde el backend. Primero se debe iniciar sesión una vez en la app con el correo de pruebas; después, agregar `POSTMAN_TEST_MODE=true` al `.env` local y ejecutar desde `D:\OBD2-PLATAFORM`:

```powershell
npm run postman:token -- tu-correo@ejemplo.com
```

5. Copiar el valor completo que muestra la consola y pegarlo en la variable `accessToken` de la colección. El token vence en una hora, no abre una ruta nueva en el backend y no debe guardarse ni compartirse por chat, correo, capturas o repositorios.

Cada desarrollador genera su propio token temporal en su equipo. Si el comando indica que el correo no existe, debe iniciar sesión primero con esa cuenta en la app contra la misma base de datos de pruebas.

## Orden de prueba

Ejecutar del 02 al 06 en orden. La solicitud 02 guarda automáticamente el identificador del vehículo en la variable `vehicleId`, que utilizan las siguientes solicitudes.

Después ejecutar las solicitudes 07 a 09. Deben fallar de manera controlada:

| Solicitud | Respuesta esperada | Significado |
| --- | --- | --- |
| 07 Kilometraje manual | `400 VALIDATION_ERROR` | El kilometraje solo llegará desde OBD2. |
| 08 VIN inválido | `400 VALIDATION_ERROR` | El VIN debe tener 17 caracteres válidos. |
| 09 Placa duplicada | `409 VEHICLE_ALREADY_EXISTS` | Ninguna cuenta puede registrar una placa que ya exista en la plataforma. |
| 10 Corrección administrativa de placa | `200` | Solo el administrador puede corregir una placa errónea y debe indicar el motivo. |
| 11 Consultar vehículo activo | `200` o `404` | Devuelve el vehículo activo de la cuenta o confirma que no existe uno. |
| 12 Cambiar vehículo activo | `200` | Selecciona como activo un vehículo propio y activo. |
| 13 Intentar reemplazar VIN como usuario | `409 VIN_CHANGE_REQUIRES_ADMIN` | Un VIN registrado no puede borrarse ni cambiarse desde una cuenta normal. |
| 14 Corrección administrativa de VIN | `200` | Solo el administrador puede corregir el VIN e indicar el motivo; el cambio queda auditado. |
| 15 Desactivar vehículo | `204` | Desactiva el vehículo creado para la prueba; no borra su historial. |
| 16 Listar marcas disponibles | `200` | Devuelve solo las marcas activas que la aplicación puede mostrar en el selector. |

## Cómo corregir un dato

- Nombre, marca, modelo, motor, combustible y transmisión: usar `05 - Editar información básica`.
- VIN pendiente: usar `06 - Registrar VIN` una sola vez con un VIN válido de 17 caracteres. No se puede enviar `null`, borrar ni reemplazar después desde una cuenta normal.
- Kilometraje: no se corrige manualmente. Quedará pendiente hasta que llegue una lectura OBD2 validada.
- Placa y año: una cuenta normal no tiene ruta de edición. Esta decisión evita cambios que afecten historiales; una placa errónea se corrige únicamente por la ruta administrativa auditada.
- Placa por error de digitación: usar la ruta administrativa solo con un token de una persona que tenga el rol persistente `ADMIN`. La solicitud debe incluir la nueva placa y un motivo. No está disponible para usuarios normales.
- VIN por error de digitación: usar `PATCH /api/v1/admin/vehicles/{vehicleId}/vin` solo con un token de una persona que tenga el rol persistente `ADMIN`. La solicitud debe incluir `vin` y `reason`. No está disponible para usuarios normales y el backend conserva la auditoría del cambio.

## Evidencia para la arquitecta

Guardar una captura de cada respuesta importante: creación correcta, edición correcta y los tres errores controlados. No incluir tokens ni datos sensibles en las capturas.
