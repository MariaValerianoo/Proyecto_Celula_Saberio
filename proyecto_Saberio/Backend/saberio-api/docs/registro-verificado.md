# Saberio: registro con verificación previa

## Flujo y endpoints
POST /api/verificacion/registro/solicitar { correo }: valida catálogo y envía código sin crear usuario. Devuelve envioAceptado solo después de aceptación SMTP y persistencia del estado; no garantiza recepción.
POST /api/verificacion/registro/confirmar { correo, codigo }: confirma código y devuelve autorizacion temporal.
POST /api/auth/registro { nombre, correo, password, rol, autorizacionRegistro }: nueva cuenta verificada; autorización vinculada al correo, vence en 10 minutos y se consume una sola vez.
Los endpoints antiguos /api/verificacion/solicitar y /confirmar se conservan para cuentas ya existentes pendientes. El middleware registrarSegundoRol conserva incorporación del otro rol con contraseña actual y correo previamente verificado. El registro público no asigna admin.

## Persistencia y seguridad
Nueva colección verificaciones_registro: identificador SHA-256 ligado al correo, HMAC del código con EMAIL_VERIFICATION_SECRET existente, nonce, límites y huella SHA-256 de autorización. No guarda contraseña, código ni autorización en texto. TTL de 24 horas; las consultas verifican vencimiento independientemente de la limpieza TTL.
Código de 10 minutos, máximo 5 intentos, espera de 60 segundos y 6 solicitudes por correo por hora. Reenvío invalida código y autorización anteriores. Restricción por correo, no protección global/IP: endurecimiento adicional pendiente para abuso distribuido. Los límites se reservan antes del envío; los fallos también consumen una solicitud. No hay reintentos automáticos de SMTP.
La autorización se consume atómicamente ANTES de crear el usuario; el índice único del correo evita cuentas duplicadas. No es una transacción entre ambas operaciones. Si el alta falla después del consumo, se exige una nueva verificación y comprobar primero si la cuenta existe; nunca se reactiva la autorización de forma insegura.
El frontend conserva autorización solo en memoria. La contraseña se pide después del código. Reabrir o reiniciar el flujo requiere verificar nuevamente. No cambia sesión, roles existentes, acreditación ni catálogo oficial.

## Pruebas
node --test tests/registroVerificado.test.js
Nueve pruebas unitarias con persistencia, validación y correo simulados: envío sin alta, alta verificada, autorización ausente, correo distinto, reutilización, concurrencia, envío fallido, intentos, vencimientos, límites y rol admin. No equivalen a integración MongoDB/SMTP real ni build frontend.

## Checklist
- [x] Código preparado de envío antes del alta.
- [x] Autorización temporal ligada a correo y consumo atómico de un solo uso.
- [x] Revalidación backend, índice único y alta definitiva verificada.
- [x] Frontend separado para cuenta nueva, segundo rol y cuenta pendiente; validación visual institucional.
- [x] Nueve pruebas unitarias superadas.
- [ ] Push aprobado y despliegue de frontend/backend compatibles.
- [ ] Build frontend y pruebas de integración con MongoDB real.
- [ ] Recepción real de código en cuenta nueva y confirmación/alta/login.
- [ ] Regresión real de segundo rol, cuentas pendientes y navegación segura.
- [ ] Recepción en otro proveedor.
- [ ] Endurecimiento global/IP contra abuso y supervisión de entregas.
- [ ] Notificaciones generales, preferencias, configuración, gestión admin, auditoría, agendamiento y UX final del checklist general.

## Comprobación después del despliegue
Las credenciales Gmail y EMAIL_VERIFICATION_SECRET existentes no cambian. Abrir /registro en despliegue nuevo, seleccionar cuenta nueva, introducir correo institucional propio y confirmación, pulsar Enviar código. Network debe mostrar /api/verificacion/registro/solicitar, no el endpoint antiguo. Confirmar recepción y usar código en Saberio, completar datos, crear cuenta y probar login. No compartir código o autorización. Ante fallo compartir únicamente status HTTP y mensaje/código de error. La cuenta no debe aparecer antes del alta definitiva.
