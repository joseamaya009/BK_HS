# Operación local del conjunto Hidro Smart

Los repositorios locales se mantienen como carpetas hermanas:

- `BD_HS`: PostgreSQL, roles y migraciones Liquibase.
- `BK_HS`: API Node.js/Express y Mosquitto de desarrollo.
- `FT_HS`: frontend web y móvil.

## Preparación

Configura `BD_HS/.env`, `BK_HS/.env` y `FT_HS/.env` a partir de sus archivos
`.env.example`. Los archivos `.env` son locales y no deben subirse a Git.

## Arranque Docker

Desde la carpeta que contiene las tres carpetas:

```powershell
.\BD_HS\scripts\start-local.ps1
docker compose --env-file .\BK_HS\.env -p hidro_smart_backend -f .\BK_HS\docker-compose.yml up -d --build
docker compose --env-file .\FT_HS\.env -p hidro_smart_frontend -f .\FT_HS\docker-compose.yml up -d --build
```

El backend en Docker usa PostgreSQL mediante `host.docker.internal:5433` y el
Mosquitto local mediante `mqtt://mosquitto:1883`. La aplicación web consume la
API en `http://localhost:3000/api/v1` cuando se abre desde el mismo equipo.

Como atajo, desde esta misma carpeta puede usarse:

```powershell
.\BK_HS\start-local.ps1 -BuildBackend -StartFrontend
```

El atajo prepara la base y aplica Liquibase antes de levantar los servicios.
Use `-SkipMigrations` únicamente cuando la base ya esté preparada y se quiera
evitar una actualización de esquema.

## Verificación manual

- API: `http://localhost:3000/health`
- Frontend: `http://localhost:5173`
- PostgreSQL desde Windows: `localhost:5433`
- MQTT local: `localhost:1883`

No ejecutes las pruebas de integración contra una base o broker de producción.
