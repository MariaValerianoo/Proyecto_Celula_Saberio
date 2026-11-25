const HttpError = require('../utils/HttpError');
function validarMensaje({ destinatario, asunto, html, texto } = {}) {
  const correo = typeof destinatario === 'string' ? destinatario.trim().toLowerCase() : '';
  if (correo.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) throw new HttpError(400, 'Destinatario inválido', 'DESTINATARIO_INVALIDO');
  if (typeof asunto !== 'string' || !asunto.trim() || asunto.length > 200 || /[\r\n]/.test(asunto)) throw new HttpError(400, 'Asunto inválido', 'ASUNTO_INVALIDO');
  const contenido = html || texto;
  if (typeof contenido !== 'string' || !contenido.trim() || contenido.length > 100000) throw new HttpError(400, 'Contenido de correo inválido', 'CONTENIDO_INVALIDO');
  return { destinatario: correo, asunto: asunto.trim(), html, texto };
}
async function enviarCorreo(datos) {
  const mensaje = validarMensaje(datos);
  const proveedor = (process.env.CORREO_PROVEEDOR || (process.env.GMAIL_USER ? 'gmail' : 'microsoft')).trim().toLowerCase();
  if (proveedor === 'microsoft') return require('./correoMicrosoft.service').enviarCorreo(mensaje);
  if (proveedor !== 'gmail') throw new HttpError(503, 'El proveedor de correo no está configurado correctamente', 'PROVEEDOR_CORREO_INVALIDO');
  const user = (process.env.GMAIL_USER || '').trim().toLowerCase();
  const pass = (process.env.GMAIL_APP_PASSWORD || '').replace(/\s/g, '');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user) || !pass) throw new HttpError(503, 'Falta configurar el remitente Gmail de Saberio', 'GMAIL_NO_CONFIGURADO');
  const transporter = require('nodemailer').createTransport({ host: 'smtp.gmail.com', port: 465, secure: true, auth: { user, pass }, connectionTimeout: 8000, greetingTimeout: 8000, socketTimeout: 12000 });
  try {
    const resultado = await transporter.sendMail({ from: { name: 'Saberio', address: user }, to: mensaje.destinatario, subject: mensaje.asunto, html: mensaje.html, text: mensaje.texto });
    const aceptados = (resultado.accepted || []).map(c => String(c).toLowerCase());
    if (!aceptados.includes(mensaje.destinatario) || resultado.rejected?.length) throw new Error('No aceptado');
    return { aceptado: true, proveedor: 'gmail', destinatario: mensaje.destinatario };
  } catch {
    throw new HttpError(502, 'No se pudo confirmar la aceptación del correo. La entrega al buzón no está garantizada.', 'ENVIO_CORREO_NO_CONFIRMADO');
  }
}
module.exports = { enviarCorreo };
