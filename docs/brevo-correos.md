# Correos transaccionales

El backend puede seleccionar Brevo, Resend o SMTP según las variables de
entorno configuradas. Para Brevo se necesita una API key v3 y un remitente
verificado:

| Variable | Valor |
| --- | --- |
| `BREVO_API_KEY` | API key v3 de Brevo; no es la clave SMTP |
| `BREVO_FROM_EMAIL` | Dirección registrada y verificada en Brevo |
| `BREVO_FROM_NAME` | `HidroSmart` |

Al iniciar el backend se informa el proveedor seleccionado y las variables
faltantes. Cada solicitud aceptada por Brevo registra su `messageId`; la
entrega final debe confirmarse en los registros de transacciones de Brevo.
