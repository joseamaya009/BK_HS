# 06 MQTT y procesos asíncronos del backend

## Alcance y fuentes

Este documento explica qué hace el backend al recibir mensajes y durante sus jobs. El contrato de topics, BLE, payloads y comandos está en el [contrato del firmware ESP32](https://github.com/joseale879/PT_HS/blob/hu-15-dev/firmware/mqtt/contract.md); esta guía lo complementa, no lo reemplaza.

## Entrada MQTT

`MqttSubscriber` mantiene una suscripción QoS configurable a:

- `hidrosmart/devices/+/telemetry`
- `hidrosmart/devices/+/status`
- `hidrosmart/devices/+/actuators/+/status`

`topics.js` valida los segmentos y determina el tipo de mensaje. El parser limita el payload (16 KiB por defecto), exige JSON objeto y valida números, fechas y métricas. Si el JSON incluye `deviceId`, debe coincidir con el código lógico del topic.

## Flujo por mensaje

| Mensaje | Handler | Efecto |
| --- | --- | --- |
| Telemetría | `reading.handler.js` | Normaliza campos, aplica compatibilidad legacy si está habilitada y persiste mediante el caso de uso de ingesta. |
| Estado del ESP32 | `device-status.handler.js` | Persiste conectividad/provisionamiento y reconcilia el vínculo contra la BD. |
| Estado de actuador | `actuator-status.handler.js` | Verifica actuador/dispositivo y registra estado y `correlationId`. |

La BD es autoridad del vínculo. Si un dispositivo vuelve `ONLINE` y reporta un estado distinto al guardado, el backend publica `confirm_link` o `unlink` con QoS 1 y `retain: false`. Los mensajes rechazados por validación se registran; no deben producir una lectura persistida parcial.

## Idempotencia y modo legacy

El firmware debe enviar un `mqttMessageId` por lectura y conservarlo al reintentar el mismo mensaje. Si falta y `MQTT_ALLOW_LEGACY_TELEMETRY` está habilitado, el handler genera un identificador `legacy-...`. Para firmware ya migrado, configura la variable en `false` y monitorea antes los rechazos. No uses un ID nuevo al reintentar una lectura ya guardada.

## Publicación y comandos

Los publicadores se abstraen detrás de `MqttPublisher`/`IMqttService`. Los comandos de dispositivo van a `.../{deviceCode}/commands`; los de actuador a `.../actuators/{actuator}/command`. El comando de actuador lleva `correlationId`, que debe conservarse en su estado de respuesta. Los comandos no se retienen para evitar ejecutar una orden vieja al reconectar.

## Jobs del backend

| Job | Intervalo por defecto | Trabajo |
| --- | ---: | --- |
| `alertGenerationJob` | 5 min | Genera eventos de alerta. |
| `materializedViewsRefreshJob` | 5 min | Actualiza agregados usados por dashboards/reportes. |
| `auditCleanupJob` | 24 h | Limpia auditoría y errores; retención 365 días y lotes de 1000 por defecto. |
| `actuatorCommandTimeoutJob` | 30 s | Marca comandos sin estado final tras 60 s; lotes de 100 por defecto. |

Los intervalos y límites se configuran con `*_INTERVAL_MS`, `AUDIT_RETENTION_DAYS`, `AUDIT_CLEANUP_BATCH_SIZE`, `ACTUATOR_COMMAND_TIMEOUT_MS` y `ACTUATOR_COMMAND_TIMEOUT_BATCH_SIZE`. Cada job evita solaparse en el proceso y usa advisory lock de PostgreSQL para evitar duplicación entre instancias.

## Verificación

- Ejecuta pruebas unitarias del subscriber, parser, handlers e ingesta.
- Ejecuta `npm run test:integration` con PostgreSQL y Mosquitto disponibles.
- `npm run simulate:iot` simula vínculo, tres lecturas y desvinculación; usa exclusivamente datos de prueba.
- La prueba física adicional debe usar sensor calibrado y verificar lectura en BD/dashboard, reconexión y recuperación BLE tras desvincular.

Una publicación aceptada por Mosquitto no prueba que quedó persistida. Valida el registro en PostgreSQL usando su `mqttMessageId`.
