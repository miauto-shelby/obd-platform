# Checklist de salida y validación técnica

## Propósito

Este checklist ayuda a revisar un cambio antes de pasarlo a `main`. No autoriza una publicación automática ni reemplaza la aprobación de arquitectura. Cada punto debe quedar marcado con evidencia: una ejecución verde, una captura sin secretos, una prueba física o un enlace a la solicitud de cambio.

## 1. Revisión del cambio

- [ ] La solicitud de cambio apunta a `main` y describe su alcance.
- [ ] La rama no contiene archivos locales, credenciales ni capturas con tokens.
- [ ] La ingeniera revisó los archivos modificados y dejó una aprobación.
- [ ] Las conversaciones de revisión pendientes están resueltas.

## 2. Backend y MongoDB

- [ ] Las pruebas automatizadas del backend finalizaron correctamente.
- [ ] Las variables `MONGODB_URI`, `MONGODB_DATABASE`, `JWT_SECRET` y `GOOGLE_WEB_CLIENT_ID` están solo en archivos locales o en el gestor de secretos del ambiente.
- [ ] No se imprimen tokens, contraseñas ni la cadena completa de MongoDB en la consola.
- [ ] La conexión a MongoDB fue validada en el ambiente correspondiente.
- [ ] Las rutas nuevas devuelven respuestas claras para éxito, datos inválidos, acceso no autorizado y datos inexistentes.

## 3. Aplicación móvil

- [ ] El análisis y las pruebas de Flutter finalizaron correctamente.
- [ ] La aplicación puede iniciar sesión, restaurar sesión y cerrar sesión en Android físico.
- [ ] Las rutas de la aplicación apuntan al ambiente correcto, sin direcciones privadas escritas en el código.
- [ ] Los mensajes de error son comprensibles para la persona usuaria y no muestran información sensible.
- [ ] La validación en iPhone queda registrada cuando se realice desde un Mac con Xcode y la cuenta Apple de la arquitecta.

## 4. Google y seguridad de acceso

- [ ] Los usuarios de prueba de Google OAuth están registrados durante la etapa de pruebas.
- [ ] Los clientes OAuth de Android, Web e iOS tienen los identificadores y firmas correctos para el ambiente probado.
- [ ] No se comparte la contraseña de la cuenta de Google ni se suben archivos de configuración privados.
- [ ] Los permisos administrativos se revisaron y toda corrección administrativa quedó registrada.

## 5. Alcance OBD2

- [ ] Se confirmó el adaptador oficial que se probará.
- [ ] Se verificó que el adaptador funciona en Android y en iPhone con el método de conexión compatible.
- [ ] Se documentaron los datos que el adaptador realmente puede leer (por ejemplo VIN, errores o kilometraje).
- [ ] Se realizaron pruebas con vehículo real antes de afirmar que una lectura OBD2 está disponible.

> Mientras estos cuatro puntos estén pendientes, el proyecto puede validar autenticación, vehículos y navegación, pero no debe presentarse como una integración OBD2 terminada.

## 6. Decisión de integración

| Resultado de la revisión | Acción |
| --- | --- |
| Todas las validaciones aplicables pasaron y existe aprobación | La ingeniera puede usar **Merge pull request** hacia `main`. |
| Falta una validación física o una decisión de arquitectura | La solicitud permanece abierta; no se hace merge. |
| Se encontró un problema | Se solicita ajuste en la misma rama y las validaciones se ejecutan de nuevo. |

## Evidencia mínima por solicitud

1. Enlace a la solicitud de cambio.
2. Resultado verde de las pruebas automáticas, cuando el repositorio tenga dichas pruebas.
3. Captura o registro de la prueba manual aplicable, ocultando secretos.
4. Aprobación de la ingeniera antes del merge.
