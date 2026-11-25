const HttpError = require('../utils/HttpError');
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function proveedorActual() { return (process.env.CORREO_PROVEEDOR || (process.env.GMAIL_USER ? 'gmail' : 'microsoft')).trim().toLowerCase(); }
function obtenerEstadoCorreo() {
  const proveedor = proveedorActual();
  if (proveedor === 'microsoft') return { proveedor, configurado: null, variablesPendientes: [], verificacionDisponible: false };
  if (proveedor !== 'gmail') return { proveedor: 'no_valido', configurado: false, variablesPendientes: ['CORREO_PROVEEDOR'], verificacionDisponible: false };
  const user = (process.env.GMAIL_USER || '').trim();
  const pass = (process.env.GMAIL_APP_PASSWORD || '').replace(/\s/g, '');
  const variablesPendientes = [];
  if (user.length > 254 || !EMAIL.test(user)) variablesPendientes.push('GMAIL_USER');
  if (!pass) variablesPendientes.push('GMAIL_APP_PASSWORD');
  return { proveedor, configurado: variablesPendientes.length === 0, variablesPendientes, verificacionDisponible: true };
}
function crearTransporteGmail() {
  if (!obtenerEstadoCorreo().configurado) throw new HttpError(503, 'Falta configurar el remitente Gmail de Saberio', 'GMAIL_NO_CONFIGURADO');
  return require('nodemailer').createTransport({ host: 'smtp.gmail.com', port: 465, secure: true, auth: { user: process.env.GMAIL_USER.trim().toLowerCase(), pass: process.env.GMAIL_APP_PASSWORD.replace(/\s/g, '') }, connectionTimeout: 8000, greetingTimeout: 8000, socketTimeout: 12000 });
}
async function verificarConfiguracionCorreo() {
  const estado = obtenerEstadoCorreo();
  if (estado.proveedor !== 'gmail') throw new HttpError(503, 'Configura CORREO_PROVEEDOR=gmail para comprobar este transporte', 'GMAIL_NO_SELECCIONADO');
  const transporte = crearTransporteGmail();
  try {
    await transporte.verify();
    return { ...estado, smtpVerificado: true, envioRealizado: false, recepcionVerificada: false };
  } catch (error) {
    if (error.code === 'EAUTH') throw new HttpError(502, 'Gmail rechazó la autenticación. Revisa la cuenta y la contraseña de aplicación.', 'GMAIL_AUTENTICACION_FALLIDA');
    if (error.code === 'ETIMEDOUT') throw new HttpError(504, 'Se agotó el tiempo de conexión con Gmail.', 'GMAIL_TIEMPO_AGOTADO');
    throw new HttpError(502, 'No se pudo verificar la conexión segura con Gmail.', 'GMAIL_CONEXION_FALLIDA');
  }
}
function validarMensaje({ destinatario, asunto, html, texto } = {}) {
  const correo = typeof destinatario === 'string' ? destinatario.trim().toLowerCase() : '';
  if (correo.length > 254 || !EMAIL.test(correo)) throw new HttpError(400, 'Destinatario inválido', 'DESTINATARIO_INVALIDO');
  if (typeof asunto !== 'string' || !asunto.trim() || asunto.length > 200 || /[\r\n]/.test(asunto)) throw new HttpError(400, 'Asunto inválido', 'ASUNTO_INVALIDO');
  const contenido = html || texto;
  if (typeof contenido !== 'string' || !contenido.trim() || contenido.length > 100000) throw new HttpError(400, 'Contenido de correo inválido', 'CONTENIDO_INVALIDO');
  return { destinatario: correo, asunto: asunto.trim(), html, texto };
}
async function enviarCorreo(datos) {
  const mensaje = validarMensaje(datos);
  const proveedor = proveedorActual();
  if (proveedor === 'microsoft') return require('./correoMicrosoft.service').enviarCorreo(mensaje);
  if (proveedor !== 'gmail') throw new HttpError(503, 'El proveedor de correo no está configurado correctamente', 'PROVEEDOR_CORREO_INVALIDO');
  const transporte = crearTransporteGmail();
  try {
    const resultado = await transporte.sendMail({ from: { name: 'Saberio', address: process.env.GMAIL_USER.trim().toLowerCase() }, to: mensaje.destinatario, subject: mensaje.asunto, html: mensaje.html, text: mensaje.texto });
    const aceptados = (resultado.accepted || []).map(c => String(c).toLowerCase());
    if (!aceptados.includes(mensaje.destinatario) || resultado.rejected?.length) throw new Error('No aceptado');
    return { aceptado: true, proveedor: 'gmail', destinatario: mensaje.destinatario };
  } catch {
    throw new HttpError(502, 'No se pudo confirmar la aceptación del correo. La entrega al buzón no está garantizada.', 'ENVIO_CORREO_NO_CONFIRMADO');
  }
}
module.exports = { enviarCorreo, obtenerEstadoCorreo, verificarConfiguracionCorreo };
