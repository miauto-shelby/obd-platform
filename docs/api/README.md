# Documentación de la API y del backend

Esta carpeta es la fuente documental del backend Node que vive en este mismo repositorio. Reúne arquitectura, decisiones, contratos, diagramas y guías de prueba; no existe un servicio independiente asociado a estos archivos.

## Migración desde el repositorio documental anterior

El contenido fue consolidado desde `OBD2-API` en la rama documental `migration/api-documentation-source`, construida a partir de los commits `4cd8eb3` y `a038226`.

Se migraron los documentos `01` a `11`, el recurso visual histórico `image.png`, el contrato `../../openapi/openapi.yaml` y la colección oficial `../../postman/My-Auto-Vehicle-Validation.postman_collection.json`.

La colección exportada localmente por una persona usuaria fue comparada con la colección oficial durante la migración. Se incorporaron las pruebas de vehículo activo y desactivación; también se añadieron las pruebas de bloqueo y corrección administrativa de VIN. La exportación local original se conserva sin modificar en `OBD2-API` hasta autorizar el retiro de ese repositorio.

## Orden de consulta

1. `01-arquitectura.md` y `04-decisiones-arquitectura.md` para contexto y reglas de negocio.
2. `03-auth-service.md` y `07-vehicle-service.md` para las rutas implementadas.
3. `../../openapi/openapi.yaml` como contrato estructurado de las rutas.
4. `08-diagramas-flujo-rutas.md` para los flujos visibles en GitHub.
5. `10-pruebas-postman-vehiculos.md` y la colección Postman para pruebas manuales.
6. `11-checklist-salida.md` antes de aprobar `develop` hacia `main`.

Antes de eliminar el repositorio anterior, se debe revisar esta migración en un Pull Request, validar el contrato OpenAPI y confirmar que la colección oficial de Postman contiene todas las solicitudes necesarias.
