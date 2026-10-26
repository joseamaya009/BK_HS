# Backend HidroSmart

API REST construida con Node.js y Express. Coordina autenticación, hogares,
dispositivos, consumo, MQTT, reportes y comunicación con PostgreSQL.

## Ejecución

La forma recomendada es levantar la pila desde la raíz del conjunto local;
consulta [docs/operacion-local.md](docs/operacion-local.md). Este repositorio
también contiene su propio `docker-compose.yml` y plantilla `.env.example` para
preparar una ejecución aislada desde su raíz.

Para ejecutar solo el backend se necesita PostgreSQL y Mosquitto accesibles
desde Windows y un archivo `.env` basado en `.env.example`:

```powershell
npm.cmd install
npm.cmd run check
npm.cmd test
npm.cmd run dev
```

La API local escucha en `http://localhost:3000` y expone salud en `/health`.
La preparación de PostgreSQL y Liquibase se realiza con
`BD_HS/scripts/start-local.ps1` antes de levantar el backend.

## Scripts

| Comando | Uso |
| --- | --- |
| `npm run dev` | Ejecuta la API con recarga por cambios. |
| `npm run check` | Revisión estática de JavaScript. |
| `npm test` | Pruebas unitarias. |
| `npm run seed:integration` | Crea usuarios de prueba para integración. |
| `npm run test:integration` | Ejecuta pruebas con PostgreSQL y MQTT. |
| `npm run simulate:iot` | Simula vínculo, telemetría y desvinculación contra recursos de prueba. |

## Documentación

- [Arquitectura y operación del backend](docs/README.md)
- [Resumen de API](docs/api.md)
- [Arquitectura general](https://github.com/joseale879/PT_HS/blob/hu-15-dev/docs/arquitectura.md)
- [Flujo IoT](https://github.com/joseale879/PT_HS/blob/hu-15-dev/docs/iot.md)
