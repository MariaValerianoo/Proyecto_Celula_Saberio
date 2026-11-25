const HttpError = require('../utils/HttpError');
const { validarCorreoInstitucional } = require('../utils/validarCorreoInstitucional');
const CAMPOS = new Set(['nombre', 'correo', 'password', 'rol', 'autorizacionRegistro']);
function validarRegistro(req, res, next) {
  const datos = req.body;
  if (!datos || typeof datos !== 'object' || Array.isArray(datos)) throw new HttpError(400, 'Debes enviar un objeto JSON con los datos de registro', 'CUERPO_INVALIDO');
  if (Object.keys(datos).some(c => !CAMPOS.has(c))) throw new HttpError(400, 'La solicitud contiene campos no permitidos', 'CAMPOS_NO_PERMITIDOS');
  const { nombre, correo, password, rol, autorizacionRegistro } = datos;
  if (typeof nombre !== 'string' || nombre.trim().length < 2 || nombre.trim().length > 100) throw new HttpError(400, 'El nombre debe tener entre 2 y 100 caracteres', 'NOMBRE_INVALIDO');
  const resultado = validarCorreoInstitucional(correo);
  if (!resultado.valido) throw new HttpError(400, resultado.mensaje, 'CORREO_INVALIDO');
  if (typeof password !== 'string' || password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) throw new HttpError(400, 'La contraseña debe tener al menos 8 caracteres, una mayúscula y un número', 'PASSWORD_INVALIDO');
  if (Buffer.byteLength(password, 'utf8') > 72) throw new HttpError(400, 'La contraseña no puede superar 72 bytes', 'PASSWORD_DEMASIADO_LARGO');
  if (rol !== 'estudiante' && rol !== 'monitor') throw new HttpError(400, 'Selecciona un rol válido: estudiante o monitor', 'ROL_INVALIDO');
  if (autorizacionRegistro !== undefined && (typeof autorizacionRegistro !== 'string' || !/^[a-f0-9]{64}$/.test(autorizacionRegistro))) throw new HttpError(400, 'Autorización de registro inválida', 'VERIFICACION_REGISTRO_INVALIDA');
  res.locals.registro = { nombre: nombre.trim(), correo: resultado.correo, password, rol, ...(autorizacionRegistro !== undefined ? { autorizacionRegistro } : {}) };
  next();
}
module.exports = validarRegistro;
