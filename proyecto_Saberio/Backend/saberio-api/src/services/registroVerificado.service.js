const { createHash, randomBytes } = require('node:crypto');
const Usuario = require('../../models/usuario.model');
const Desafio = require('../../models/verificacionRegistro.model');
const HttpError = require('../utils/HttpError');
const { validarCorreoInstitucional } = require('../utils/validarCorreoInstitucional');
const { generarCodigoVerificacion, coincideCodigo } = require('../utils/codigoVerificacion');
const { enviarCodigoVerificacion } = require('./notificacion.service');
const { generarPasswordHash } = require('./password.service');
const hash = valor => createHash('sha256').update(valor).digest('hex');
const idCorreo = correo => hash('registro:' + correo);
const invalido = () => new HttpError(400, 'El código o la autorización no es válido, venció o ya fue utilizado.', 'VERIFICACION_REGISTRO_INVALIDA');
function normalizar(correo) {
  const resultado = validarCorreoInstitucional(correo);
  if (!resultado.valido) throw new HttpError(400, resultado.mensaje, 'CORREO_INVALIDO');
  return resultado.correo;
}
async function solicitar(correo) {
  correo = normalizar(correo);
  if (await Usuario.exists({ correo })) throw new HttpError(409, 'No se puede iniciar un alta nueva. Usa el flujo de cuenta existente o recupera tu acceso.', 'REGISTRO_NO_DISPONIBLE');
  const id = idCorreo(correo);
  const ahora = new Date();
  const generado = generarCodigoVerificacion(id);
  await Desafio.init();
  try {
    await Desafio.updateOne({ _id: id }, { $setOnInsert: { ventanaEn: ahora, envios: 0, intentos: 0, eliminarEn: new Date(ahora.getTime() + 86400000) } }, { upsert: true });
  } catch (error) { if (error.code !== 11000) throw error; }
  const actual = await Desafio.findById(id).lean();
  if (!actual) throw new HttpError(503, 'Reintenta la solicitud de verificación.', 'DESAFIO_NO_DISPONIBLE');
  const nuevaVentana = !actual.ventanaEn || ahora.getTime() - new Date(actual.ventanaEn).getTime() >= 3600000;
  const filtro = { _id: id, ventanaEn: actual.ventanaEn, envios: actual.envios, $or: [{ creadoEn: { $exists: false } }, { creadoEn: { $lte: new Date(ahora.getTime() - 60000) } }] };
  if (!nuevaVentana) filtro.envios = { $eq: actual.envios, $lt: 6 };
  const set = { nonce: generado.nonce, huella: generado.huella, venceEn: generado.venceEn, creadoEn: ahora, intentos: 0, enviado: false, confirmado: false, consumida: false, eliminarEn: new Date(ahora.getTime() + 86400000) };
  if (nuevaVentana) { set.ventanaEn = ahora; set.envios = 1; }
  const actualizado = await Desafio.findOneAndUpdate(filtro, { $set: set, $unset: { autorizacionHuella: 1, autorizacionVenceEn: 1 }, ...(!nuevaVentana ? { $inc: { envios: 1 } } : {}) }, { new: true });
  if (!actualizado) throw new HttpError(429, 'Espera 60 segundos entre solicitudes. Máximo seis solicitudes por correo por hora.', 'REGISTRO_REENVIO_LIMITADO');
  await enviarCodigoVerificacion({ destinatario: correo, codigo: generado.codigo, venceEn: generado.venceEn });
  const enviado = await Desafio.findOneAndUpdate({ _id: id, nonce: generado.nonce }, { $set: { enviado: true } }, { new: true });
  if (!enviado) throw invalido();
  return { mensaje: 'El servidor de correo aceptó el envío del código. Revisa tu bandeja y spam. La cuenta todavía no se ha creado.', envioAceptado: true };
}
async function confirmar({ correo, codigo }) {
  correo = normalizar(correo);
  if (typeof codigo !== 'string' || !/^\d{6}$/.test(codigo.trim())) throw invalido();
  const id = idCorreo(correo);
  const actual = await Desafio.findOneAndUpdate({ _id: id, enviado: true, confirmado: false, consumida: false, venceEn: { $gt: new Date() }, intentos: { $lt: 5 } }, { $inc: { intentos: 1 } }, { new: true });
  if (!actual || !coincideCodigo({ usuarioId: id, codigo: codigo.trim(), nonce: actual.nonce, huella: actual.huella })) throw invalido();
  const autorizacion = randomBytes(32).toString('hex');
  const confirmado = await Desafio.findOneAndUpdate({ _id: id, nonce: actual.nonce, confirmado: false, consumida: false, venceEn: { $gt: new Date() } }, { $set: { confirmado: true, autorizacionHuella: hash(autorizacion), autorizacionVenceEn: new Date(Date.now() + 600000) }, $unset: { huella: 1 } }, { new: true });
  if (!confirmado) throw invalido();
  return { mensaje: 'Correo confirmado. Completa los datos para crear tu cuenta.', autorizacion };
}
async function registrar(datos) {
  const res = { locals: {} };
  require('../middlewares/validarRegistro')({ body: datos }, res, () => {});
  const { nombre, correo, password, rol } = res.locals.registro;
  const autorizacion = datos.autorizacionRegistro;
  if (typeof autorizacion !== 'string' || !/^[a-f0-9]{64}$/.test(autorizacion)) throw invalido();
  await Usuario.init();
  if (await Usuario.exists({ correo })) throw new HttpError(409, 'La cuenta ya existe. Usa tus credenciales actuales.', 'REGISTRO_NO_DISPONIBLE');
  const passwordHash = await generarPasswordHash(password);
  const usado = await Desafio.findOneAndUpdate({ _id: idCorreo(correo), confirmado: true, consumida: false, autorizacionHuella: hash(autorizacion), autorizacionVenceEn: { $gt: new Date() } }, { $set: { consumida: true }, $unset: { autorizacionHuella: 1 } }, { new: true });
  if (!usado) throw invalido();
  try {
    const usuario = await Usuario.create({ nombre, correo, passwordHash, roles: [rol], correoVerificado: true, correoVerificadoEn: new Date(), estadoCuenta: 'habilitada', acreditacionMonitor: 'no_solicitada' });
    return { id: usuario._id.toString(), nombre: usuario.nombre, correo: usuario.correo, roles: [...usuario.roles], correoVerificado: true, estadoCuenta: usuario.estadoCuenta, acreditacionMonitor: usuario.acreditacionMonitor };
  } catch (error) {
    if (error.code === 11000) throw new HttpError(409, 'La cuenta ya existe. Usa tus credenciales actuales.', 'REGISTRO_NO_DISPONIBLE');
    throw new HttpError(503, 'No se pudo completar el alta. Comprueba si la cuenta se creó antes de solicitar una nueva verificación.', 'ALTA_NO_COMPLETADA');
  }
}
module.exports = { solicitar, confirmar, registrar };
