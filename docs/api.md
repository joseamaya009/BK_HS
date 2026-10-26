# Resumen de API

Base local: `http://localhost:3000/api/v1`.

Las rutas requieren sesión salvo `health` y las operaciones públicas de
autenticación. Las respuestas y validaciones concretas están en controladores,
DTOs y pruebas; este documento evita duplicar contratos completos que cambian
con el código.

| Recurso | Prefijo | Capacidades |
| --- | --- | --- |
| Salud | `/health` | Estado de vida, preparación y salud de la API. |
| Autenticación | `/auth` | Registro, login, refresh, logout, recuperación y cambio de contraseña. |
| Usuarios | `/users` | Perfil propio, preferencias, notificaciones y administración. |
| Hogares | `/homes` | Hogares, miembros, invitaciones y solicitudes. |
| Dispositivos | `/devices` | Vínculo, hardware, configuración, estado, telemetría y desvinculación. |
| Consumo | `/consumption` | Resúmenes, series diarias, mensuales, horarias, costo y presupuesto. |
| Alertas y metas | `/alerts`, `/goals`, `/vacation` | Reglas, historial, umbrales, objetivos y modo vacaciones. |
| Administración | `/roles`, `/audit`, `/tariffs`, `/support` | Roles, auditoría, tarifas y tickets. |
| Privacidad y reportes | `/privacy`, `/reports` | Exportación, consentimientos, solicitudes y archivos PDF/Excel. |
| Automatización | `/actuators`, `/recommendations` | Estados, comandos y recomendaciones. |

## Sesión desde el navegador

El navegador debe enviar credenciales (`credentials: include`). Antes de una
petición mutable, el cliente obtiene `GET /auth/csrf`: el backend fija la cookie
CSRF y devuelve el token en el encabezado `X-CSRF-Token`. Para `POST`, `PUT`,
`PATCH` y `DELETE` con cookie de sesión, el navegador envía ese token en el
encabezado. El cliente HTTP ya hace el bootstrap y, si recibe `403` con
`error.code=CSRF_INVALID`, renueva el token y reintenta una vez. Otros `403`
representan rechazo de permisos y no se reintentan.

El backend aplica un límite amplio por IP a rutas públicas de autenticación y
un límite adicional por identificador a login, registro y solicitudes de
recuperación/verificación. Las cuotas locales se reinician al reiniciar el
proceso; una instalación con varias réplicas necesita almacenamiento de límites
compartido.

## Dispositivos

El orden funcional es:

1. `POST /devices/link` vincula un código lógico disponible al hogar.
2. El dispositivo comunica su `hardwareId`; el backend lo reclama y publica
   la confirmación por MQTT.
3. `PUT /devices/:deviceId/config` guarda configuración operativa permitida.
4. `DELETE /devices/:deviceId/home/:homeId` desvincula y ordena reactivar BLE.
5. `DELETE /devices/:deviceId` solo debe realizarse después de desvincular.
