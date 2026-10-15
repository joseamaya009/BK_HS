# Auditoria backend y base de datos

Fecha de verificacion: **2026-09-23**.

## Resultado

El backend esta conectado a PostgreSQL y MQTT. Usa `hidro_smart_app` para las
consultas HTTP y `hidro_smart_ingest` para la funcion protegida de ingesta.
Liquibase esta actualizado en 239 changesets.

```text
GET /health/ready -> 200
database         -> up
mqtt             -> up
```

## Pruebas

- Sintaxis: 215 archivos de produccion correctos.
- Unitarias: 172 aprobadas.
- Integracion actual: 4 aprobadas, 0 fallidas y 2 omitidas por falta de
  credenciales de usuario de integracion.
- MQTT: insercion de telemetria y rechazo del duplicado por `mqttMessageId`.
- RLS: aislamiento de hogares, dispositivos, reportes y privacidad aprobado.

## Rutas montadas

El backend monta `/api/v1/auth`, `/homes`, `/devices`, `/consumption`, `/users`,
`/tariffs`, `/alerts`, `/goals`, `/vacation`, `/roles`, `/support`, `/audit`,
`/privacy`, `/reports`, `/recommendations` y `/actuators`.

Cada modulo tiene un repositorio PostgreSQL o invoca una funcion SQL versionada.
La telemetria MQTT no usa una ruta REST; llega por Mosquitto y se persiste con
`device.fn_ingest_sensor_reading`.

## Situacion IoT

La base actual esta limpia: 0 dispositivos y 0 lecturas. Para que una lectura
del ESP32 se persista deben cumplirse estas condiciones:

1. El `deviceCode` del topic debe coincidir con `device.device.code`.
2. El dispositivo debe estar activo.
3. Debe existir una relacion activa en `home.home_device`.
4. El payload debe respetar el contrato MQTT.
5. El `mqttMessageId` debe ser unico por dispositivo. El modo legacy puede
   generar un identificador transitorio mientras se actualiza el firmware.

## Pendientes

- Ejecutar las dos pruebas de integracion omitidas con cuentas sembradas.
- Probar ESP32/YF-S201 real durante varios minutos.
- Validar actuadores con ACK y timeout fisicos.
- Configurar ACL/TLS de Mosquitto para produccion.
- Conectar la generacion automatica de predicciones y recomendaciones.
