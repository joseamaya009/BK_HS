# 01_api: interfaz HTTP, controladores y seguridad

## Propósito

La carpeta src/api adapta solicitudes HTTP a los casos de uso. No contiene la
regla de negocio central ni SQL de persistencia: autentica, aplica permisos,
valida la forma de la petición y delega en la capa application.

El montaje global está en src/app.js. Todas las rutas de negocio se publican
bajo /api/v1; health se monta en /health.

## Flujo de una solicitud

1. Express aplica Helmet, CORS, JSON limitado a 4 MB y protección CSRF.
2. La ruta aplica authenticate cuando el recurso requiere sesión.
3. Cuando corresponde, requirePermission consulta el permiso funcional.
4. El controlador traduce parámetros, query y body al caso de uso.
5. El caso de uso usa puertos; los adaptadores PostgreSQL o MQTT realizan la
   operación.
6. asyncHandler, notFound y errorHandler normalizan la respuesta y los errores.

## Archivos de rutas

- **actuator.routes.js:** registra las rutas de estados y comandos de actuadores.
- **alert.routes.js:** registra las rutas de alertas, reglas, historial y umbrales.
- **audit.routes.js:** registra la consulta paginada de auditoría.
- **auth.routes.js:** registra autenticación, sesiones, verificación y recuperación de contraseña.
- **consumption.routes.js:** registra consultas de resumen, series, costo y presupuesto de consumo.
- **device.routes.js:** registra alta, vínculo, estado, configuración, telemetría y retiro de dispositivos.
- **goal.routes.js:** registra CRUD y progreso de metas de consumo.
- **health.routes.js:** expone liveness, readiness y estado básico del servicio.
- **home.routes.js:** registra hogares, miembros e invitaciones de membresía.
- **privacy.routes.js:** registra exportación, consentimientos y solicitudes de privacidad.
- **recommendation.routes.js:** registra consulta y actualización de recomendaciones.
- **report.routes.js:** registra generación, descarga e historial de reportes PDF y Excel.
- **role.routes.js:** registra consulta, asignación y retiro de roles de usuarios.
- **support.routes.js:** registra catálogos, tickets y respuestas de soporte.
- **tariff.routes.js:** registra la consulta de tarifa vigente por hogar.
- **user.routes.js:** registra perfil, preferencias, notificaciones y administración de cuentas.
- **vacation.routes.js:** registra consulta, guardado y retiro del modo vacaciones.

Todas las rutas, salvo health y los endpoints públicos de auth, requieren
sesión autenticada. Los endpoints de modificación con sesión por cookie deben
enviar el encabezado CSRF configurado.

## Controladores

- **ActuatorController.js:** traduce solicitudes de actuadores en comandos, estados e historial.
- **AlertController.js:** coordina reglas, umbrales, alertas pendientes e historial.
- **AuditController.js:** devuelve la auditoría autorizada con filtros y paginación.
- **AuthController.js:** gestiona registro, login, cookies, sesiones, verificación y contraseñas.
- **ConsumptionController.js:** entrega consumo resumido, series, costo y presupuesto.
- **DeviceController.js:** coordina el ciclo de vida, telemetría, vínculo y desvínculo de dispositivos.
- **GoalController.js:** coordina creación, edición, eliminación y progreso de metas.
- **HomeController.js:** coordina hogares, miembros, roles e invitaciones.
- **PrivacyController.js:** coordina exportación de datos, consentimientos y solicitudes ARCO.
- **RecommendationController.js:** consulta, actualiza y resume recomendaciones de consumo.
- **ReportController.js:** genera, almacena, descarga y consulta reportes de consumo.
- **RoleController.js:** coordina roles funcionales de usuarios.
- **TariffController.js:** consulta la referencia tarifaria actual de un hogar.
- **TicketController.js:** coordina tickets de soporte, estados y respuestas.
- **UserController.js:** coordina perfil, preferencias, notificaciones y administración de usuarios.
- **VacationController.js:** coordina el modo vacaciones de cada hogar.

Los controladores no deben incluir SQL ni publicar directamente a MQTT. Su
responsabilidad es transformar el contrato HTTP en una llamada de aplicación y
formatear la respuesta.

## Middleware

- **auth.js:** obtiene el token desde cookie HttpOnly o Bearer de compatibilidad,
  lo verifica y carga el usuario autenticado en la petición.
- **authRateLimit.js:** construye el límite de intentos para rutas sensibles de
  autenticación, incluyendo una clave que evita depender solo de una IP.
- **requirePermission.js:** crea middleware que exige un permiso funcional
  usando el PermissionChecker.

## Seguridad de cookies

- **authCookies.js:** analiza cookies, establece y borra cookies de acceso,
  refresh y CSRF, compara valores de forma segura y aplica protección CSRF a
  métodos mutables.

Las cookies de sesión son HttpOnly; el token CSRF no lo es para que el cliente
pueda reflejarlo en el encabezado. La configuración de Secure, SameSite,
dominio y nombres de cookies sale de src/config/env.js.

## Mapa de prefijos

| Prefijo | Recurso |
| --- | --- |
| /health | Vida, preparación y salud |
| /api/v1/auth | Registro, sesión y credenciales |
| /api/v1/users | Cuenta, preferencias y administración |
| /api/v1/homes | Hogares y membresías |
| /api/v1/devices | Dispositivos, vínculo y telemetría |
| /api/v1/consumption | Consumo, costo, series y presupuesto |
| /api/v1/alerts, /goals, /vacation | Alertas, metas y vacaciones |
| /api/v1/roles, /audit, /support | Administración y soporte |
| /api/v1/privacy, /reports | Privacidad y reportes |
| /api/v1/tariffs, /recommendations, /actuators | Tarifas, recomendaciones y automatización |

Para el contrato funcional resumido consulta api.md. Esta guía explica qué
archivo implementa cada tramo de la interfaz.
