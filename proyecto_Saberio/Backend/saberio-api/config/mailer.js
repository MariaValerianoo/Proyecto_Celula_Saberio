const { enviarCorreo } = require('../src/services/correoProveedor.service');
async function enviarCorreoSaberio(destinatario, asunto, html, texto) {
  return enviarCorreo({ destinatario, asunto, html, texto });
}
module.exports = { transporter: null, enviarCorreo: enviarCorreoSaberio };
