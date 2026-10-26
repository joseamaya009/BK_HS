# 05_runtime-tests: arranque, MQTT, jobs y pruebas

## Arranque del servicio

- **server.js:** inicia Express, pools PostgreSQL, jobs y suscripción MQTT;
  además maneja SIGINT y SIGTERM cerrando recursos ordenadamente.
- **src/app.js:** construye el servidor Express, aplica seguridad HTTP, CORS,
  JSON, CSRF, rutas y manejadores de error.
- **start-local.ps1:** ayuda a iniciar el backend en Windows con la
  configuración local.
- **Dockerfile:** empaqueta el proceso Node del backend.
- **docker-compose.yml:** define la ejecución aislada del backend y sus
  dependencias para este módulo.
- **.env.example:** enumera la configuración necesaria sin secretos reales.
- **.env.local.example:** sirve de plantilla para ejecución local.

## Archivos por carpeta

### Jobs programados

- **actuatorCommandTimeoutJob.js:** cierra y marca comandos de actuador vencidos.
- **alertGenerationJob.js:** genera eventos de alerta periódicamente.
- **auditCleanupJob.js:** elimina auditoría antigua según la retención configurada.
- **materializedViewsRefreshJob.js:** refresca vistas materializadas de forma periódica.

### MQTT de entrada

- **actuator-status.handler.js:** procesa estados MQTT publicados por actuadores.
- **device-status.handler.js:** procesa presencia, Wi-Fi y estado operativo del dispositivo.
- **reading.handler.js:** procesa telemetría de caudal, pulsos y consumo.
- **message-parser.js:** valida y normaliza payloads MQTT recibidos.
- **topics.js:** construye y centraliza los tópicos MQTT del contrato.

### Utilidades compartidas

- **http.js:** centraliza errores HTTP, asyncHandler, paginación y contexto de petición.
- **report-formatters.js:** convierte reportes de consumo a PDF y Excel.
- **runtimeState.js:** mantiene estado de ejecución compartido y acotado.

### Scripts operativos

- **check-javascript.js:** revisa estáticamente archivos JavaScript del backend.
- **seed-integration-users.js:** prepara usuarios de prueba para integración.
- **simulate-iot-e2e.js:** simula vínculo, telemetría y desvínculo MQTT de un ESP32.
- **stress-auth-csrf.js:** simula clientes HTTP para verificar bootstrap CSRF,
  refresh inválido, CORS y límites compartidos por IP sin usar PostgreSQL.

### Pruebas de integración

- **backend-postgres.test.js:** prueba de integración de backend postgres.test.
- **mqtt-postgres.test.js:** prueba de integración de mqtt postgres.test.
- **roles-permissions.test.js:** prueba de integración de roles permissions.test.

### Pruebas unitarias

- **account-admin-service.test.js:** prueba unitaria de account admin service.test.
- **actuator-command-timeout-job.test.js:** prueba unitaria de actuator command timeout job.test.
- **actuator-use-cases.test.js:** prueba unitaria de actuator use cases.test.
- **add-home-member.test.js:** prueba unitaria de add home member.test.
- **alert-generation-job.test.js:** prueba unitaria de alert generation job.test.
- **alert-history.test.js:** prueba unitaria de alert history.test.
- **alert-use-cases.test.js:** prueba unitaria de alert use cases.test.
- **audit-cleanup-job.test.js:** prueba unitaria de audit cleanup job.test.
- **audit-operations.test.js:** prueba unitaria de audit operations.test.
- **auth-cookies.test.js:** prueba unitaria de auth cookies.test.
- **auth-middleware.test.js:** distingue token inválido, sesión revocada y fallo
  de PostgreSQL durante la autenticación.
- **auth-rate-limit.test.js:** prueba unitaria de auth rate limit.test.
- **budget-status.test.js:** prueba unitaria de budget status.test.
- **change-home-member-role.test.js:** prueba unitaria de change home member role.test.
- **consumption-series.test.js:** prueba unitaria de consumption series.test.
- **consumption-summary.test.js:** prueba unitaria de consumption summary.test.
- **deactivate-device.test.js:** prueba unitaria de deactivate device.test.
- **device.entity.test.js:** prueba unitaria de device.entity.test.
- **device-controller-unlink-mqtt.test.js:** prueba unitaria de device controller unlink mqtt.test.
- **device-hardware-identity.test.js:** prueba unitaria de device hardware identity.test.
- **get-current-home-tariff.test.js:** prueba unitaria de get current home tariff.test.
- **get-home.test.js:** prueba unitaria de get home.test.
- **get-period-cost.test.js:** prueba unitaria de get period cost.test.
- **home.entity.test.js:** prueba unitaria de home.entity.test.
- **home-membership-request.test.js:** prueba unitaria de home membership request.test.
- **http-errors.test.js:** prueba unitaria de http errors.test.
- **ingest-reading.test.js:** prueba unitaria de ingest reading.test.
- **latest-device-telemetry.test.js:** prueba unitaria de latest device telemetry.test.
- **link-device.test.js:** prueba unitaria de link device.test.
- **list-device-telemetry.test.js:** prueba unitaria de list device telemetry.test.
- **list-home-members.test.js:** prueba unitaria de list home members.test.
- **list-user-devices.test.js:** prueba unitaria de list user devices.test.
- **login-pending.test.js:** prueba unitaria de login pending.test.
- **login-security.test.js:** prueba unitaria de login security.test.
- **materialized-views-job.test.js:** prueba unitaria de materialized views job.test.
- **mqtt.test.js:** prueba unitaria de mqtt.test.
- **mqtt-payload-limit.test.js:** prueba unitaria de mqtt payload limit.test.
- **notification-preferences.test.js:** prueba unitaria de notification preferences.test.
- **notification-service.test.js:** prueba unitaria de notification service.test.
- **password-operations.test.js:** prueba unitaria de password operations.test.
- **password-policy.test.js:** prueba unitaria de password policy.test.
- **password-reset-context.test.js:** prueba unitaria de password reset context.test.
- **password-reset-email.test.js:** prueba unitaria de password reset email.test.
- **privacy-operations.test.js:** prueba unitaria de privacy operations.test.
- **recommendation-use-cases.test.js:** prueba unitaria de recommendation use cases.test.
- **register-device.test.js:** prueba unitaria de register device.test.
- **register-user.test.js:** prueba unitaria de register user.test.
- **remove-home-member.test.js:** prueba unitaria de remove home member.test.
- **report-export.test.js:** prueba unitaria de report export.test.
- **report-history.test.js:** prueba unitaria de report history.test.
- **request-context.test.js:** prueba unitaria de request context.test.
- **require-permission.test.js:** prueba unitaria de require permission.test.
- **role-operations.test.js:** prueba unitaria de role operations.test.
- **session-management.test.js:** prueba unitaria de session management.test.
- **ticket-operations.test.js:** prueba unitaria de ticket operations.test.
- **unlink-device.test.js:** prueba unitaria de unlink device.test.
- **update-home.test.js:** prueba unitaria de update home.test.
- **user-profile.test.js:** prueba unitaria de user profile.test.
- **vacation-use-cases.test.js:** prueba unitaria de vacation use cases.test.


## Verificación

- npm.cmd run check revisa sintaxis y convenciones JavaScript.
- npm.cmd test ejecuta las pruebas unitarias.
- npm.cmd run test:integration necesita PostgreSQL y MQTT disponibles.
- npm.cmd run simulate:iot comprueba el recorrido vincular -> telemetría ->
  desvincular con datos de prueba.
- `node scripts/stress-auth-csrf.js 300 100` comprueba HTTP aislado con 300
  clientes virtuales y concurrencia máxima 100; no mide login real ni base de
  datos. No usarlo como evidencia de capacidad de producción.

Las pruebas se organizan por comportamiento. Al modificar un caso de uso,
repositorio, política de autorización o tópico MQTT, actualiza el test del
mismo nombre o crea uno nuevo junto a esa familia.
