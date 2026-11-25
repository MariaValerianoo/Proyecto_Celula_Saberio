# Activación y comprobación de Gmail en Saberio

## Configurar sin cambiar código
En las variables de entorno del proyecto que ejecuta el backend:
CORREO_PROVEEDOR=gmail
GMAIL_USER=<cuenta remitente autorizada>
GMAIL_APP_PASSWORD=<contraseña de aplicación de Google>

No usar prefijo VITE_, no poner contraseñas en el repositorio ni compartirlas por chat. La plantilla config/gmail.env.example contiene únicamente nombres y valores vacíos. Para desarrollo local, incorporar esas tres variables a Backend/saberio-api/.env sin reemplazar las variables existentes de MongoDB, sesión u otros servicios. La plantilla no se carga automáticamente.
En Vercel seleccionar el entorno que se va a probar y crear un nuevo despliegue después de guardar las variables.

## Comprobar conexión sin enviar
Con una sesión de administrador activa en el mismo sitio:
GET /api/admin/correo/estado
POST /api/admin/correo/verificar

El primer endpoint no conecta con Gmail; solo indica proveedor y nombres de variables pendientes. El segundo comprueba DNS/conexión/TLS/autenticación mediante SMTP verify. Ambos heredan autenticar y requerirRol('admin') del router padre y no devuelven secretos. No existe un endpoint público para probar credenciales ni uno para enviar libremente mensajes.
Ejemplo desde la consola del navegador, en el panel admin:
fetch('/api/admin/correo/verificar', { method: 'POST', credentials: 'include' }).then(async r => ({ status: r.status, resultado: await r.json() })).then(console.log)
No repetir en bucle ni pegar credenciales o códigos en la consola. La sesión debe seguir activa; visitar el inicio público la cierra.

Alternativa local desde Backend/saberio-api:
node scripts/verificarCorreo.js
Este comando carga el .env local y no envía mensajes. No incluir credenciales como argumentos del comando.

## Interpretación
smtpVerificado=true, envioRealizado=false, recepcionVerificada=false: conexión autenticada, pero todavía no se probó entrega.
GMAIL_NO_CONFIGURADO: faltan variables o el remitente es inválido.
GMAIL_NO_SELECCIONADO: seleccionar CORREO_PROVEEDOR=gmail.
GMAIL_AUTENTICACION_FALLIDA: revisar cuenta, contraseña de aplicación y configuración de seguridad de Google.
GMAIL_TIEMPO_AGOTADO / GMAIL_CONEXION_FALLIDA: revisar conectividad y posibles bloqueos; no equivalen a contraseña incorrecta.
401/403: la sesión o el rol no autorizan el diagnóstico; no es un resultado de Gmail.

## Prueba real de códigos
1. Confirmar SMTP en el entorno desplegado.
2. Usar el formulario de verificación con una cuenta institucional propia pendiente, o solicitar recuperación de una cuenta propia existente. Las respuestas genéricas no prueban por sí solas que se haya enviado un mensaje.
3. Comprobar recepción (incluido spam) y usar el código únicamente en Saberio. No compartirlo.
4. Repetir en otra cuenta institucional propia de proveedor distinto cuando esté disponible. No modificar el catálogo para admitir Gmail personal ni registrar cuentas ajenas.
5. Confirmar el código, probar código erróneo/vencido y rechazo de reutilización en el flujo de verificación. Conservar las esperas de reenvío existentes.

Este cambio no ejecuta envíos reales, no modifica usuarios ni implementa aún verificación previa al alta. No afirmar recepción Gmail a Outlook sin comprobarla.

## Checklist de esta preparación
- [x] Configuración compartida entre envío y diagnóstico.
- [x] Diagnóstico administrativo sin exponer secretos ni enviar mensajes.
- [x] Comando local y plantilla sin credenciales.
- [ ] Configuración real en el entorno del backend y nuevo despliegue.
- [ ] Verificación SMTP real.
- [ ] Recepción y confirmación real de códigos.
- [ ] Recepción en otro proveedor.
- [ ] Verificación previa a crear cuentas nuevas y resto del checklist general.
