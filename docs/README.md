# Backend: arquitectura y operación

## Estructura

| Directorio | Contenido |
| --- | --- |
| `src/api` | Rutas HTTP, controladores, middleware de autenticación y permisos. |
| `src/core` | Casos de uso, entidades, puertos y repositorios PostgreSQL. |
| `src/mqtt` | Cliente, suscripciones, parser y handlers de mensajes IoT. |
| `src/jobs` | Procesos periódicos: alertas, auditoría, vistas y comandos vencidos. |
| `src/config` | Variables de entorno y configuración de servicios. |
| `src/shared` | Errores, contexto de petición y utilidades HTTP. |
| `tests` | Pruebas unitarias e integración. |

La entrada HTTP es `src/app.js`. Las rutas y las migraciones de base de datos
son la fuente de verdad de la API y persistencia respectivamente.

## Guías detalladas por capa

- [01_api: interfaz HTTP y seguridad](01_api.md)
- [02_application: casos de uso, contratos y DTO](02_application.md)
- [03_domain: entidades y reglas centrales](03_domain.md)
- [04_infrastructure: PostgreSQL, correo, seguridad y MQTT](04_infrastructure.md)
- [05_runtime-tests: arranque, jobs, MQTT y pruebas](05_runtime-tests.md)
- [06_mqtt-y-procesos-asincronos: tópicos y tareas periódicas](06_mqtt-y-procesos-asincronos.md)
- [07_autorizacion-y-permisos: permisos, roles y RLS](07_autorizacion-y-permisos.md)
- [Resumen del contrato HTTP](api.md)
- [Contrato OpenAPI: rutas y seguridad](openapi.yaml)

## Autenticación y autorización

- Login y renovación escriben cookies de acceso/refresh `HttpOnly`.
- Las solicitudes mutables realizadas con cookies requieren `X-CSRF-Token`.
- `authenticate` acepta cookies y conserva Bearer como compatibilidad de API.
- Las rutas usan permisos funcionales; PostgreSQL aplica RLS con contexto de
  usuario como segunda barrera.

## MQTT

El backend se suscribe a telemetría, estado de dispositivo y estado de
actuadores. Valida mensajes, deduplica `mqttMessageId`, persiste lecturas y
publica comandos de vínculo o desvínculo. El contrato del ESP32 está en
[../../firmware/mqtt/contract.md](../../firmware/mqtt/contract.md).

`MQTT_ALLOW_LEGACY_TELEMETRY` debe permanecer en `false` para firmware actual.
Solo actívalo temporalmente si se está migrando una placa antigua sin
`mqttMessageId`.

## Variables importantes

Usa `.env.example` como referencia. Las variables mínimas son `DB_*`,
`DB_INGEST_*`, `JWT_*`, `CORS_ORIGIN`, `MQTT_BROKER_URL` y `MQTT_DEVICE_HOST`.
No documentes ni confirmes valores reales de `.env`.

## Verificación

```powershell
npm.cmd run check
npm.cmd test
npm.cmd run test:integration
```

La integración requiere la pila local y variables `INTEGRATION_*`; consulta
[../../docs/pruebas.md](../../docs/pruebas.md).
