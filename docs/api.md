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

El navegador debe enviar credenciales (`credentials: include`). Para `POST`,
`PUT`, `PATCH` y `DELETE` autenticados por cookie, debe incluir
`X-CSRF-Token` con el valor de la cookie CSRF. El cliente HTTP del frontend ya
realiza ambos pasos.

## Dispositivos

El orden funcional es:

1. `POST /devices/link` vincula un código lógico disponible al hogar.
2. El dispositivo comunica su `hardwareId`; el backend lo reclama y publica
   la confirmación por MQTT.
3. `PUT /devices/:deviceId/config` guarda configuración operativa permitida.
4. `DELETE /devices/:deviceId/home/:homeId` desvincula y ordena reactivar BLE.
5. `DELETE /devices/:deviceId` solo debe realizarse después de desvincular.
