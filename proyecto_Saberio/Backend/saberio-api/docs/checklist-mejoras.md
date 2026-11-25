# Saberio: checklist de mejoras

## Estados al preparar este cambio
- [x] Seguridad de navegación: commits cb47fae y 89560fa; usuario confirmó funcionamiento tras el segundo.
- [x] Código preparado para catálogo único en config/dominiosInstitucionales.js y consumo desde frontend. No se crea un catálogo MongoDB.
- [x] Código preparado para validación exacta y sin distinguir mayúsculas en registro, login y recuperación.
- [x] Adaptador preparado para Gmail, manteniendo las interfaces actuales de verificación, recuperación y notificaciones.
- [x] Seis pruebas unitarias del adaptador con SMTP simulado.
- [ ] Push de este bloque aprobado y completado.
- [ ] Build del frontend y pruebas de regresión por tres roles.
- [ ] Gmail configurado en producción y recepción real comprobada en proveedores distintos.
- [ ] Validación visual inmediata del campo de registro.
- [ ] Verificar antes de crear cuentas nuevas: autorización temporal de un solo uso vinculada al correo; revalidación backend y protección contra duplicados y concurrencia.
- [ ] Regresión del flujo de cuentas antiguas pendientes y segundo rol; no habilitar registro público de administradores.
- [ ] Notificaciones generales para tres roles, preferencias persistidas, entregas y recordatorios idempotentes.
- [ ] Configuración funcional: cuenta, preferencias y cambio de contraseña.
- [ ] Gestión administrativa de usuarios, invitaciones seguras y auditoría.
- [ ] Agendamiento administrativo con validaciones compartidas, control concurrente de horarios y notificaciones a ambas partes.
- [ ] UX consistente y documentación final de endpoints y pruebas.

## Cambios de este bloque
GET /api/auth/dominios-institucionales devuelve únicamente el catálogo oficial existente. El frontend lo carga antes de mostrar páginas públicas y reutiliza su validador síncrono en los tres formularios. Si falla la carga, no inventa una lista alternativa. El backend conserva sus validaciones obligatorias. No se ha cambiado aún el orden creación/verificación del registro: no dar ese requisito por completado.

El mailer actual delega al nuevo adaptador. CORREO_PROVEEDOR admite gmail o microsoft. Si no está definida, se elige Gmail únicamente cuando existe GMAIL_USER; de lo contrario se conserva Microsoft para no romper el transporte actual. Un proveedor configurado incorrectamente genera error y no se cambia automáticamente a otro proveedor después de un fallo.

## Activación Gmail
Configurar únicamente en el entorno del backend, sin incluir secretos en GitHub, frontend o chat:
- CORREO_PROVEEDOR=gmail
- GMAIL_USER: cuenta remitente autorizada.
- GMAIL_APP_PASSWORD: contraseña de aplicación, no la contraseña de la cuenta.
El nombre visible es Saberio. El transporte usa smtp.gmail.com:465 con TLS. No restringe el proveedor del destinatario: la política institucional pertenece al registro, no al transporte.

No se han configurado credenciales ni enviado correos reales desde estas pruebas. SMTP aceptado no garantiza recepción en bandeja. Probar una solicitud real y comprobar la recepción, sin publicar el código. No se añaden reintentos automáticos de envíos con resultado incierto para evitar duplicados.

## Pruebas
Desde Backend/saberio-api: node --test tests/correoProveedor.test.js.
Después del despliegue: probar registro/login/recuperación con dominios autorizados y mayúsculas; rechazar Gmail personal para registro, subdominios no listados y sufijos falsos; repetir la prueba de Atrás/Adelante y los flujos de estudiante, monitor y admin.
