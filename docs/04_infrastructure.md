# 04_infrastructure: PostgreSQL, seguridad, correo y MQTT

## Propósito

src/core/infrastructure contiene adaptadores que conectan los puertos de
application con servicios concretos. Aquí viven SQL, pools PostgreSQL,
publicación y suscripción MQTT, JWT, bcrypt, SMTP y almacenamiento de reportes.

Un cambio de proveedor debe concentrarse aquí: por ejemplo, otro broker MQTT o
motor de base de datos no debería obligar a reescribir los casos de uso.

## Archivos por carpeta

### Configuración y base de datos

- **env.js:** valida y normaliza variables de entorno, cookies, JWT, SMTP, jobs y base de datos.
- **mqtt.js:** normaliza URL, credenciales, QoS, límite de payload y compatibilidad MQTT.
- **db.js:** crea los pools PostgreSQL normal e ingest y expone transacciones con contexto.

### Repositorios PostgreSQL

- **PostgresActuatorRepository.js:** implementa en PostgreSQL el repositorio Actuator Repository.
- **PostgresAlertRepository.js:** implementa en PostgreSQL el repositorio Alert Repository.
- **PostgresAuditRepository.js:** implementa en PostgreSQL el repositorio Audit Repository.
- **PostgresAuthRepository.js:** implementa en PostgreSQL el repositorio Auth Repository.
- **PostgresConsumptionRepository.js:** implementa en PostgreSQL el repositorio Consumption Repository.
- **PostgresDeviceRepository.js:** implementa en PostgreSQL el repositorio Device Repository.
- **PostgresGoalRepository.js:** implementa en PostgreSQL el repositorio Goal Repository.
- **PostgresHomeRepository.js:** implementa en PostgreSQL el repositorio Home Repository.
- **PostgresPrivacyRepository.js:** implementa en PostgreSQL el repositorio Privacy Repository.
- **PostgresRecommendationRepository.js:** implementa en PostgreSQL el repositorio Recommendation Repository.
- **PostgresReportRepository.js:** implementa en PostgreSQL el repositorio Report Repository.
- **PostgresRoleRepository.js:** implementa en PostgreSQL el repositorio Role Repository.
- **PostgresTariffRepository.js:** implementa en PostgreSQL el repositorio Tariff Repository.
- **PostgresTelemetryRepository.js:** implementa en PostgreSQL el repositorio Telemetry Repository.
- **PostgresTicketRepository.js:** implementa en PostgreSQL el repositorio Ticket Repository.
- **PostgresUserRepository.js:** implementa en PostgreSQL el repositorio User Repository.
- **PostgresVacationRepository.js:** implementa en PostgreSQL el repositorio Vacation Repository.

### Seguridad

- **BcryptPasswordHasher.js:** adapta hash y comparación de contraseñas usando bcrypt.
- **JwtTokenService.js:** emite y verifica JWT de acceso y refresh.
- **PostgresPermissionChecker.js:** consulta permisos funcionales usando PostgreSQL.

### Notificaciones

- **SmtpEmailSender.js:** envía correo SMTP a través del puerto de notificaciones.

### Servicios MQTT y reportes

- **MqttClient.js:** implementa el adaptador MQTT Mqtt Client.
- **mqttClientSingleton.js:** implementa el adaptador MQTT mqtt Client Singleton.
- **MqttPublisher.js:** implementa el adaptador MQTT Mqtt Publisher.
- **MqttSubscriber.js:** implementa el adaptador MQTT Mqtt Subscriber.
- **ReportStorage.js:** gestiona la persistencia local de archivos de reporte generados.


## Reglas de seguridad

- db.js mantiene un pool de aplicación y otro de ingestión; la telemetría no
  debe usar un usuario con permisos administrativos.
- Los repositorios establecen el contexto de usuario antes de operaciones que
  dependan de RLS.
- JwtTokenService y BcryptPasswordHasher centralizan credenciales para evitar
  implementar criptografía en controladores.
- MqttPublisher y MqttSubscriber son los únicos adaptadores que deben hablar
  con el broker desde la capa infrastructure.
