const Usuario = require('../../models/usuario.model');
const Materia = require('../../models/materia.model');
const { enviarCorreo } = require('../../config/mailer');

async function notificarNuevaSolicitud(
  solicitud
) {
  try {
    const monitor = await Usuario.findById(
      solicitud.monitor
    );

    if (!monitor) {
      return;
    }

    if (!monitor.notificacionesCorreo) {
      return;
    }

    const materia = await Materia.findById(
      solicitud.materia
    );

    const enlace = `${process.env.FRONTEND_URL}/solicitudes/${solicitud._id}`;

    const asunto =
      'Nueva solicitud de monitoría en Saberio';

    const html = `
      <h2>Nueva solicitud de monitoría</h2>
      <p>Hola, ${monitor.nombre}:</p>
      <p>Un estudiante ha enviado una nueva solicitud de monitoría.</p>
      <ul>
        <li><strong>Materia:</strong> ${
          materia ? materia.nombre : 'No disponible'
        }</li>
        <li><strong>Tema:</strong> ${solicitud.tema}</li>
        <li><strong>Fecha preferida:</strong> ${new Date(
          solicitud.fechaPreferida
        ).toLocaleDateString('es-CO')}</li>
        <li><strong>Hora preferida:</strong> ${solicitud.horaPreferida}</li>
        <li><strong>Modalidad:</strong> ${solicitud.modalidad}</li>
      </ul>
      <p>
        Puedes revisar y gestionar la solicitud aquí:
        <a href="${enlace}">Ver solicitud</a>
      </p>
    `;

    await enviarCorreo(
      monitor.correo,
      asunto,
      html
    );
  } catch (error) {
    console.error(
      'No fue posible enviar la notificación por correo:',
      error.message
    );
  }
}

async function enviarCodigoVerificacion({
  destinatario,
  codigo,
  venceEn,
}) {
  const asunto = 'Código de verificación de Saberio';

  const html = `
    <h2>Verifica tu cuenta</h2>
    <p>Tu código de verificación es:</p>
    <p style="font-size: 28px; font-weight: bold;">${codigo}</p>
    <p>Este código vence el ${new Date(venceEn).toLocaleString('es-CO')}.</p>
    <p>Si no solicitaste este código, ignora este correo.</p>
  `;

  await enviarCorreo(destinatario, asunto, html);
}
async function enviarCodigoRecuperacion({
  destinatario,
  codigo,
  venceEn,
}) {
  const asunto =
    'Recuperación de contraseña de Saberio';

  const html = `
    <h2>Recupera tu contraseña</h2>
    <p>Recibimos una solicitud para cambiar la contraseña de tu cuenta de Saberio.</p>
    <p>Tu código de recuperación es:</p>
    <p style="font-size: 28px; font-weight: bold;">
      ${codigo}
    </p>
    <p>Este código tiene una vigencia de 15 minutos.</p>
    <p>Vence el ${new Date(venceEn).toISOString()} (UTC).</p>
    <p>Si no solicitaste este cambio, ignora este correo.</p>
    <p>No compartas este código con nadie.</p>
  `;

  await enviarCorreo(
    destinatario,
    asunto,
    html
  );
}

module.exports = {
  notificarNuevaSolicitud,
  enviarCodigoVerificacion,
  enviarCodigoRecuperacion,
};