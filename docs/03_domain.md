# 03_domain: entidades y reglas centrales

## Propósito

src/core/domain guarda entidades puras. Estas clases no deben depender de
Express, PostgreSQL, MQTT ni variables de entorno. Reciben datos, verifican
invariantes y representan conceptos que se mantienen aunque cambie la
tecnología exterior.

## Archivos

- **ConsumptionSummary.js:** representa el resumen de consumo que usa la aplicación.
- **Device.js:** encapsula invariantes del dispositivo, identidad de hardware y estado de vínculo.
- **Home.js:** encapsula reglas básicas y datos de un hogar.
- **User.js:** encapsula reglas básicas y datos de una cuenta de usuario.

Las reglas de acceso a datos se implementan mediante casos de uso, puertos,
RLS y funciones de PostgreSQL; las entidades conservan las invariantes que
deben ser independientes de esos adaptadores.
