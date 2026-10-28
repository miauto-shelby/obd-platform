# Documentación del backend

Esta carpeta contiene solo la documentación que acompaña al backend implementado. El contrato de rutas está en `../../openapi/openapi.yaml` y las solicitudes de prueba en `../../postman/My-Auto-Vehicle-Validation.postman_collection.json`.

## Documentos vigentes

1. `07-vehicle-service.md`: rutas de vehículos, reglas de propiedad, VIN, placa y administración.
2. `08-diagramas-flujo-rutas.md`: flujos que se visualizan directamente en GitHub.
3. `09-preparacion-integracion-obd2.md`: límites y decisiones pendientes antes de crear rutas OBD2.
4. `10-pruebas-postman-vehiculos.md`: preparación, orden y resultados esperados de las pruebas manuales.

Las reglas se mantienen en el código y en el contrato OpenAPI. Si una ruta cambia, se actualiza su operación OpenAPI, el diagrama afectado y la prueba Postman correspondiente en el mismo cambio.
