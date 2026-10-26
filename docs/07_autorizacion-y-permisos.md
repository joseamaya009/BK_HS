# 07 Autorización y permisos

## Dos niveles distintos

El backend combina permisos globales de aplicación y membresías de hogar:

- Roles globales: `Administrator`, `HomeUser`, `Guest` y `Support` si está asignado.
- Roles por hogar: `Owner`, `Member` y `Guest`, guardados en `home.home_user`.

No se debe inferir que `Guest` global da acceso a todos los hogares ni que `HomeUser` equivale automáticamente a `Owner`. La membresía activa y el `homeId` delimitan los datos accesibles.

## Permisos funcionales sembrados

| Permiso | Uso principal |
| --- | --- |
| `users.manage` | Administración de cuentas. |
| `roles.manage` | Asignación y retiro de roles globales. |
| `homes.manage` | Administración permitida de hogares y funciones asociadas. |
| `devices.manage` | Cambios de dispositivo, vínculo y desvínculo. |
| `consumption.read` | Consulta de consumo y presupuesto. |
| `reports.read` | Consulta y descarga de reportes. |
| `alerts.manage` | Reglas, umbrales y estados de alertas. |
| `tickets.manage` | Gestión administrativa de tickets. |
| `audit.read` | Consulta de auditoría autorizada. |
| `mfa.manage` | Administración de MFA. |
| `credentials.manage` | Operaciones de credenciales autorizadas. |

La asignación inicial está en `BD_HS/02_dml/00_inserts/010_rbac_permissions.sql`. Esa semilla documenta los grants por rol, pero las rutas y políticas vigentes determinan el acceso efectivo.

## Flujo de autorización

1. `authenticate` valida cookie de sesión o Bearer de compatibilidad y establece la identidad de la petición.
2. `requirePermission` consulta `PostgresPermissionChecker` para permisos explícitos de ruta. Un rechazo devuelve 403.
3. Los repositorios consultan PostgreSQL dentro de una transacción que configura el contexto de usuario utilizado por las funciones y políticas RLS.
4. RLS limita filas de hogar, dispositivo y ticket incluso si se alcanzó una ruta autenticada.
5. El frontend puede ocultar navegación, pero nunca sustituye estos controles.

Las peticiones mutables con cookie requieren además `X-CSRF-Token`. CSRF protege el origen de la petición; no decide permisos.

## Mapa indicativo por área

| Área | Permiso o regla de servidor |
| --- | --- |
| Administración de usuarios | `users.manage` |
| Gestión de roles | `roles.manage` |
| Consumo y presupuesto | `consumption.read` + acceso al hogar en RLS |
| Reportes | `reports.read` + acceso a datos del hogar |
| Auditoría | `audit.read` |
| Reglas y umbrales de alertas | `alerts.manage` |
| Cambios de dispositivo | `devices.manage` + vínculo vigente con hogar |
| Cambios de ticket | `tickets.manage`; lectura/respuesta valida propietario o rol gestor |
| Vacaciones, metas y membresías | permiso de gestión correspondiente y acceso al hogar |

La matriz exacta de cada router está en `src/api/*.routes.js`. Al cambiar un permiso, actualiza ruta, seed DML, RLS si aplica y pruebas en el mismo cambio.

## Pruebas mínimas ante cambios

- Sin sesión → 401; sesión sin permiso → 403.
- Un miembro solo consulta sus hogares activos.
- Guest puede leer solo donde está autorizado; no debe obtener permisos de gestión por ocultar/mostrar un botón.
- Owner gestiona solo hogares que posee.
- Administrator opera conforme a sus permisos; las validaciones y auditoría siguen aplicando.
- Petición mutable con cookie sin CSRF → rechazo.
- Cambiar `homeId` en una petición no debe revelar datos de otro hogar.

Para políticas y privilegios PostgreSQL consulta [../../BD_HS/docs/03_dcl.md](../../BD_HS/docs/03_dcl.md) y [../../BD_HS/docs/07_rls-y-seguridad.md](../../BD_HS/docs/07_rls-y-seguridad.md).
