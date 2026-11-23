const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
const json = (schema) => ({ 'application/json': { schema } });
const body = (name) => ({ required: true, content: json(ref(name)) });
const respuesta = (description, schema) => ({ description, ...(schema ? { content: json(schema) } : {}) });
const mensaje = { type: 'object', properties: { mensaje: { type: 'string' } } };
const correo = { type: 'string', format: 'email', example: 'cuenta@example.com' };
const codigo = { type: 'string', pattern: '^\\d{6}$', example: '123456' };
const errores = { default: { description: 'Respuesta de error de la API; el formato depende del manejador de errores.' } };
const post = (tag, summary, schema, status = '200', responseSchema = mensaje) => ({ tags: [tag], summary, requestBody: body(schema), responses: { [status]: respuesta('Operación completada', responseSchema), ...errores } });
const usuario = { type: 'object', description: 'Perfil público del usuario; no contiene contraseña ni token de sesión.' };
module.exports = {
  openapi: '3.0.3',
  info: { title: 'Saberio API', version: '1.0.0', description: 'Documentación inicial: salud, autenticación y verificación de correo. Los demás módulos todavía no están documentados. Las operaciones de prueba modifican datos reales y pueden enviar correos. Usar cuentas de prueba.' },
  servers: [{ url: '/api', description: 'API del mismo origen, local o desplegada' }],
  tags: [{ name: 'Salud' }, { name: 'Autenticación' }, { name: 'Verificación' }],
  components: {
    securitySchemes: { cookieSesion: { type: 'apiKey', in: 'cookie', name: 'saberio_sesion', description: 'Iniciar sesión con /auth/login desde esta interfaz. El navegador administra la cookie HttpOnly; no se introduce manualmente.' } },
    schemas: {
      Mensaje: mensaje,
      Usuario: usuario,
      Registro: { type: 'object', required: ['nombre', 'correo', 'password', 'rol'], properties: { nombre: { type: 'string' }, correo, password: { type: 'string', format: 'password', writeOnly: true }, rol: { type: 'string', enum: ['estudiante', 'monitor'] } } },
      Login: { type: 'object', required: ['correo', 'contrasena'], properties: { correo, contrasena: { type: 'string', format: 'password', writeOnly: true } } },
      Correo: { type: 'object', required: ['correo'], properties: { correo } },
      ConfirmacionCorreo: { type: 'object', required: ['correo', 'codigo'], properties: { correo, codigo } },
      Restablecimiento: { type: 'object', additionalProperties: false, required: ['correo', 'codigo', 'nuevaContrasena', 'confirmacionContrasena'], properties: { correo, codigo, nuevaContrasena: { type: 'string', format: 'password', minLength: 8, pattern: '^(?=.*[A-Z])(?=.*[0-9]).{8,}$', description: 'Máximo 72 bytes UTF-8.', writeOnly: true }, confirmacionContrasena: { type: 'string', format: 'password', description: 'Debe coincidir con nuevaContrasena.', writeOnly: true } } },
      CambioPerfil: { type: 'object', additionalProperties: false, required: ['nombre'], properties: { nombre: { type: 'string' } } },
      RespuestaUsuario: { type: 'object', properties: { mensaje: { type: 'string' }, usuario: ref('Usuario') } }
    }
  },
  paths: {
    '/salud': { get: { tags: ['Salud'], summary: 'Consultar salud y estado de MongoDB', responses: { 200: respuesta('Estado del servicio', { type: 'object', properties: { estado: { type: 'string' }, servicio: { type: 'string' }, baseDeDatos: { type: 'string' } } }), 503: respuesta('Base de datos no disponible en la entrada serverless') } } },
    '/auth/registro': { post: post('Autenticación', 'Registrar cuenta', 'Registro', '201', ref('RespuestaUsuario')) },
    '/auth/login': { post: { ...post('Autenticación', 'Iniciar sesión y establecer cookie HttpOnly', 'Login', '200', ref('RespuestaUsuario')), description: 'Ejecutar desde el mismo origen que la API para que el navegador conserve la cookie.' } },
    '/auth/logout': { post: { tags: ['Autenticación'], summary: 'Cerrar sesión y limpiar cookie', responses: { 200: respuesta('Sesión cerrada', mensaje), ...errores } } },
    '/auth/perfil': {
      get: { tags: ['Autenticación'], summary: 'Consultar perfil autenticado', security: [{ cookieSesion: [] }], responses: { 200: respuesta('Perfil público', ref('RespuestaUsuario')), ...errores } },
      put: { ...post('Autenticación', 'Actualizar nombre del perfil', 'CambioPerfil', '200', ref('RespuestaUsuario')), security: [{ cookieSesion: [] }] }
    },
    '/auth/recuperar-contrasena': { post: { ...post('Autenticación', 'Solicitar código de recuperación por correo', 'Correo'), description: 'No devuelve el código de recuperación en la respuesta.' } },
    '/auth/restablecer-contrasena': { post: post('Autenticación', 'Restablecer contraseña con código de seis dígitos', 'Restablecimiento') },
    '/verificacion/solicitar': { post: post('Verificación', 'Solicitar envío de código de verificación', 'Correo') },
    '/verificacion/confirmar': { post: post('Verificación', 'Confirmar correo con código de seis dígitos', 'ConfirmacionCorreo') }
  }
};
