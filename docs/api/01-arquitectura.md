# Arquitectura General

## Objetivo

Desarrollar una plataforma para el monitoreo y diagnóstico vehicular mediante dispositivos OBDII conectados por Bluetooth.

## Arquitectura

- Aplicación móvil (Android / iOS)
- API Gateway
- Arquitectura basada en microservicios
- Base de datos
- Autenticación con Google
- Comunicación Bluetooth con el OBDII

## Componentes principales

- Mobile App
- API Gateway
- Auth Service
- Vehicle Service
- OBD Service
- Diagnostic Service
- Notification Service
- Maintenance Service

## Responsabilidad del backend

El backend expone contratos de datos reutilizables. Recibe solicitudes, valida reglas del negocio, guarda o consulta la información necesaria y responde datos en formato JSON. No depende de pantallas, botones ni flujos exclusivos de la aplicación móvil; otra aplicación autorizada puede consumir los mismos endpoints.

La aplicación móvil se encarga únicamente de presentar esos datos e iniciar las solicitudes del usuario.

## Documentación relacionada

- 02-estandares-api.md
- 03-auth-service.md
- 04-decisiones-arquitectura.md
- 05-mapa-de-microservicios.md
- 08-diagramas-flujo-rutas.md
- 09-preparacion-integracion-obd2.md
