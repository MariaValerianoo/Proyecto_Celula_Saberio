const {
  enviarCorreo,
} = require('../services/correoMicrosoft.service');

async function enviarCorreoSaberio(
  destinatario,
  asunto,
  html
) {
  return enviarCorreo({
    destinatario,
    asunto,
    html,
  });
}

module.exports = {
  transporter: null,
  enviarCorreo: enviarCorreoSaberio,
};
