# Preparación MQTT para producción

## Estado y arquitectura

El backend ya conecta un único cliente MQTT, consume telemetría y estados,
valida los payloads, deduplica por `mqttMessageId` y persiste las lecturas por
medio de `device.fn_ingest_sensor_reading`. Los endpoints HTTP existentes
exponen la telemetría al frontend. La web no necesita conectarse directamente
al broker ni usar MQTT sobre WebSockets.

```text
ESP32 ↔ broker MQTT ↔ backend ↔ PostgreSQL de Supabase
                              ↑
frontend React/Vite ── HTTPS ─┘
```

El broker **no está desplegado**. `docker/mosquitto/mosquitto.conf` y el
servicio `mosquitto` de `docker-compose.yml` son para desarrollo local: usan
TCP sin TLS, permiten conexiones anónimas y no tienen un volumen Docker para
conservar los datos del broker al recrear el contenedor; el servicio tampoco
tiene health check propio. No publiques esa
configuración como servicio de producción.

El backend continúa levantando la API cuando el broker no responde, siempre
que `MQTT_BROKER_URL` esté configurada. El cliente MQTT reintenta la conexión;
`GET /health/ready` devuelve 503 mientras falte la conexión/suscripción MQTT o
la base de datos. `GET /health/live` solo informa si el proceso HTTP sigue vivo.
Los logs registran estado y resultado de ingesta, no payloads, SSID, IP, IDs de
dispositivo ni topics concretos.

El cliente usa `clean: true`: al estar desconectado no conserva una sesión MQTT
con cola de telemetría para recibir mensajes publicados durante la caída. Al
reconectar vuelve a suscribirse. Si el requisito es no perder lecturas durante
una interrupción, hay que acordar y probar sesiones persistentes, identificador
de cliente estable y cola QoS del broker antes de considerar la disponibilidad
resuelta.

## Decisión de despliegue

| Alternativa | Ventajas | Pendientes y riesgos |
| --- | --- | --- |
| A. Mosquitto como servicio independiente | Reutiliza la tecnología y el código de configuración existentes; el broker puede tener su propio ciclo de actualización y respaldo. No exige otro repositorio. | Hay que elegir alojamiento, disco persistente, respaldos, monitoreo, disponibilidad, TLS, autenticación y ACL. La configuración local actual no sirve para producción. |
| B. Repositorio dedicado `HidroSmart-MQTT` | Separa la propiedad y el ciclo de vida de la infraestructura del broker. | Añade otro repositorio y operación sin que hoy exista un proveedor, equipo de infraestructura o necesidad de compartir la configuración entre varias aplicaciones. No resuelve por sí solo disponibilidad ni seguridad. |

Recomendación actual: no crear otro repositorio. Mantener los artefactos de
Mosquitto junto al backend y desplegar el broker como servicio independiente
cuando se seleccione el proveedor. No se puede comparar costo ni disponibilidad
con datos reales hasta conocer el proveedor y el nivel de servicio requerido.

El servicio elegido debe aceptar MQTT TCP con TLS para el ESP32 y el backend,
verificar certificados, exigir autenticación, permitir ACL por dispositivo y
topic, conservar datos/sesiones según la garantía de entrega acordada y
proporcionar monitoreo, respaldos y un procedimiento de recuperación. No se
requieren WebSockets mientras el frontend consuma la API HTTP.

## Configuración del backend en Render

Configura estos valores en el entorno del servicio backend. Los valores entre
corchetes son campos que debe entregar el proveedor; no son direcciones ni
credenciales de producción.

| Variable | Uso |
| --- | --- |
| `NODE_ENV` | Debe ser `production`; activa las validaciones seguras de MQTT. |
| `MQTT_BROKER_URL` | URL TLS con el host y puerto reales, por ejemplo la forma `mqtts://<host-del-proveedor>:<puerto-TLS>`. No incluyas usuario, contraseña, tokens ni query strings con secretos en esta URL. |
| `MQTT_USERNAME` | Usuario de backend creado en el broker y guardado como variable secreta en Render. |
| `MQTT_PASSWORD` | Contraseña de ese usuario, guardada como secreto en Render. |
| `MQTT_CLIENT_ID` | Identificador estable y único por instancia. Si se ejecutan varias réplicas, cada una necesita un identificador distinto para que no se desconecten entre sí. |
| `MQTT_QOS` | Nivel de suscripción; el valor actual por defecto es `1`. |
| `MQTT_ALLOW_LEGACY_TELEMETRY` | Mantener en `false` para exigir el `mqttMessageId` del firmware actual. |
| `MQTT_RECONNECT_PERIOD_MS` | Pausa entre intentos de reconexión; valor actual por defecto `3000`. |
| `MQTT_CONNECT_TIMEOUT_MS` | Tiempo de conexión; valor actual por defecto `10000`. |
| `MQTT_MAX_PAYLOAD_BYTES` | Límite del payload; valor actual por defecto `16384`. |

En producción el backend rechaza `mqtt://` y `ws://`, exige `mqtts://` o
`wss://`, requiere usuario y contraseña en sus variables separadas y rechaza
credenciales embebidas en la URL. La biblioteca conserva la validación normal
del certificado TLS; no desactives la verificación para resolver errores de
certificado. La configuración actual no carga certificados CA privados ni
certificados cliente. Si el proveedor solo ofrece autenticación por certificado
cliente o una CA privada, se necesita implementar y revisar ese soporte antes
de conectarlo.

`MQTT_USERNAME` y `MQTT_PASSWORD` son credenciales del backend. No las copies
a variables `VITE_*`, al bundle móvil, al firmware compartido ni al repositorio.
El broker debe dar a esa cuenta solo los permisos requeridos para suscribirse a
los topics de telemetría/estado y publicar comandos.

## Dispositivos y frontend

El contrato de topics está centralizado en `src/mqtt/topics.js` y el contrato
de payloads en el parser y sus handlers. La telemetría se publica en
`hidrosmart/devices/<deviceCode>/telemetry`; los estados usan los topics
`.../status` y `.../actuators/<actuator>/status`. Los comandos de dispositivo
usan `.../commands` y los de actuador `.../actuators/<actuator>/command`.
Configura las ACL según estos contratos y las acciones realmente habilitadas.

No se encontró el código fuente del ESP32 en el espacio de trabajo. El payload
BLE del frontend envía al dispositivo `mqttHost`, `mqttPort` y `deviceCode`,
pero no envía usuario, contraseña, modo TLS ni certificado CA. Antes de
producción hay que confirmar en firmware cómo valida TLS y cómo recibe una
credencial única por dispositivo. No uses una cuenta compartida o anónima para
todos los dispositivos; el firmware y el flujo de aprovisionamiento deben
permitir que las ACL limiten cada dispositivo a sus topics.

El frontend web usa `VITE_API_URL` para HTTPS hacia la API y obtiene la
telemetría mediante los endpoints HTTP actuales. `VITE_MQTT_DEVICE_HOST` y
`VITE_MQTT_DEVICE_PORT` son datos públicos del broker que pueden enviarse por
BLE para configurar el ESP32; no son credenciales MQTT. Configura esos valores
con el host y puerto reales alcanzables desde la red del dispositivo cuando
uses el aprovisionamiento. La URL de API de producción y el dominio permitido
en `CORS_ORIGIN` también deben coincidir con los dominios reales de Vercel y
Render.

## Supabase y persistencia

El repositorio `BD_HS` ya contiene la tabla de lecturas, la clave de
idempotencia y la función de ingesta con permisos de rol separados. No se
requiere una migración nueva para la ruta actual del backend.

En Render configura el endpoint PostgreSQL de Supabase y el modo TLS exigido
por Supabase. Si usas `DB_HOST`/`DB_PORT`, configura `DB_SSL=true`. Si usas
`DATABASE_URL`, incluye el parámetro TLS proporcionado por Supabase; se
recomienda y se exige `sslmode=verify-full` para validar la cadena y el nombre
del servidor. En producción el backend rechaza `sslmode=require`, `verify-ca`,
`no-verify` y TLS desactivado. También puede usarse `ssl=true`, cuya
validación TLS depende de las opciones estándar de Node.js.

Si se usa `DATABASE_URL` con un usuario de aplicación y también se configuran
`DB_INGEST_USER` y `DB_INGEST_PASSWORD`, el backend deriva la URL del pool de
ingesta con ese usuario y contraseña y conserva el host, la base y los
parámetros de conexión/TLS de la URL original. No pegues una URL real en Git,
logs o documentación. Verifica en Supabase que los cambios Liquibase esperados
estén aplicados y que la cuenta de ingesta pueda ejecutar la función sin
permisos de escritura generales. Esa comprobación remota sigue pendiente.

## Validación y promoción

Desde `BK_HS`, ejecuta `npm.cmd run check` y `npm.cmd test`. Las
pruebas de integración MQTT/PostgreSQL crean y borran filas de prueba; ejecútalas
solo contra una base desechable y un broker de pruebas, nunca contra Supabase de
producción. Después de elegir el broker, comprueba `/health/ready`, la
reconexión, la suscripción, la persistencia de una lectura duplicada y la
publicación de comandos con un ESP32 de prueba.

Promueve esta rama mediante revisión: `feature/mqtt-production-setup` a
`develop`, valida el entorno de desarrollo, luego promueve secuencialmente a
`qa`, `staging` y `main`. En cada paso conserva la validación y protección de la
rama destino. El estado de publicación se confirma en el historial de PR del
repositorio; esta guía no acredita un despliegue ni validación en producción.

## Pendientes para declarar producción

- Seleccionar el proveedor y comprobar conectividad TCP TLS desde Render y la
  red física del ESP32; confirmar persistencia, disponibilidad, respaldos y
  costos.
- Desplegar el broker con autenticación, autorización por topic, TLS y
  monitoreo; crear cuentas separadas para backend y dispositivos.
- Confirmar soporte de TLS y credenciales únicas en firmware; actualizar el
  aprovisionamiento BLE si hace falta.
- Configurar Render, Vercel y Supabase con sus valores reales usando los
  gestores de secretos correspondientes.
- Verificar migraciones y TLS contra el proyecto Supabase correcto.
- Ejecutar pruebas con broker aislado, firmware y datos desechables; revisar
  salud en `qa` y `staging` antes de autorizar cualquier promoción a `main`.
