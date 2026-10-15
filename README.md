# Backend HidroSmart

API REST construida con Node.js y Express. Coordina autenticación, hogares,
dispositivos, consumo, MQTT, reportes y comunicación con PostgreSQL.

## Ejecución

La forma recomendada es levantar la pila desde la raíz del repositorio; consulta
[../docs/operacion-local.md](../docs/operacion-local.md).

Para ejecutar solo el backend se necesita PostgreSQL y Mosquitto accesibles
desde Windows y un archivo `BK_HS/.env` basado en `.env.example`:

```powershell
Set-Location BK_HS
npm.cmd install
npm.cmd run check
npm.cmd test
npm.cmd run dev
```

La API local escucha en `http://localhost:3000` y expone salud en `/health`.

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
- [Arquitectura general](../docs/arquitectura.md)
- [Flujo IoT](../docs/iot.md)
