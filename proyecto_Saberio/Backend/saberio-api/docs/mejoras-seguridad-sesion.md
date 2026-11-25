# Saberio: mejoras integradas y seguridad de navegación

## Primer bloque implementado en este cambio
- Revocación del JWT concreto al cerrar sesión, usando SHA-256 en MongoDB; no se almacena el token.
- La autenticación comprueba la revocación en el backend.
- Los nuevos inicios de sesión reciben identificadores únicos.
- Entrar a /, /login o /registro cierra la sesión anterior antes de mostrar la página pública.
- La navegación protegida vuelve a validar la sesión al cambiar de entrada del historial, recuperar foco o restaurar una página.
- Se oculta el contenedor privado al abandonar el documento para reducir la exposición por restauración del navegador. No se pretende desactivar los botones de historial.
- Lecturas de API con Cache-Control private, no-store.
- La incorporación de segundo rol se conserva; se realiza con correo y contraseña existentes desde registro, no abriendo el rol admin al público.

## Despliegue
No requiere credenciales nuevas. Utiliza MongoDB y JWT_SECRETO existentes. La nueva colección sesiones_revocadas guarda huellas y vencimientos con índice TTL. No modifica usuarios, soportes, dominios ni sesiones de tutoría.

## Pruebas
Ejecutar desde Backend/saberio-api: node --test tests/sesionSegura.test.js.
Son pruebas con dobles de persistencia, no una prueba de integración con MongoDB real.
En navegador, repetir con estudiante, monitor y admin: iniciar sesión, navegar entre módulos, ir al inicio público, usar Atrás y Adelante, escribir una URL privada y comprobar que requiere login. Repetir restaurando pestaña y con dos pestañas abiertas. Probar que un cierre fallido no muestra éxito y permite reintentar. Verificar que un nuevo login sí funciona después de logout y que otro token del mismo usuario no se revoca accidentalmente.
No confundir un build correcto con validación real de restauración del navegador.

## Alcance restante: no implementado por este bloque
1. Correo Gmail desacoplado y verificación previa al registro, conservando config/dominiosInstitucionales.js como única fuente oficial y la compatibilidad con cuentas pendientes.
2. Notificaciones generales para tres roles, preferencias persistidas por canal, entregas de correo y recordatorios idempotentes.
3. Configuración funcional: cuenta, preferencias y cambio de contraseña.
4. Gestión administrativa de usuarios con invitaciones seguras y auditoría.
5. Agendamiento administrativo con validación compartida, control concurrente de horarios y notificaciones a ambas partes.
6. UX consistente, pruebas de regresión por rol y documentación de endpoints.

Mantener rutas, roles, estilos y funciones existentes. No afirmar envío Gmail a Outlook comprobado sin verificar recepción real.
