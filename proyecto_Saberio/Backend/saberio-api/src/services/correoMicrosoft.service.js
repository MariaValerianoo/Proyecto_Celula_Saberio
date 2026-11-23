const {
  obtenerConfiguracionMicrosoft,
} = require('../../config/microsoft');


const microsoftSesion = require('./microsoftSesion.service');


const GRAPH_SEND_MAIL_URL =
  'https://graph.microsoft.com/v1.0/me/sendMail';


const TIMEOUT_MS = 30000;


const PERMISO_ENVIO =
  'https://graph.microsoft.com/Mail.Send';


function crearError(mensaje, codigo) {
  const error = new Error(mensaje);
  error.codigo = codigo;
  return error;
}


function normalizarDestinatario(correo) {
  if (typeof correo !== 'string') {
    throw crearError(
      'Destinatario inválido.',
      'DESTINATARIO_INVALIDO',
    );
  }


  const destinatario = correo.trim().toLowerCase();


  if (
    destinatario.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(destinatario)
  ) {
    throw crearError(
      'Destinatario inválido.',
      'DESTINATARIO_INVALIDO',
    );
  }


  return destinatario;
}


function construirMensaje({ destinatario, asunto, texto }) {
  if (
    typeof asunto !== 'string' ||
    asunto.trim().length === 0 ||
    asunto.length > 200 ||
    /[\r\n]/.test(asunto)
  ) {
    throw crearError(
      'Asunto inválido.',
      'ASUNTO_INVALIDO',
    );
  }


  if (
    typeof texto !== 'string' ||
    texto.trim().length === 0 ||
    texto.length > 20000
  ) {
    throw crearError(
      'Contenido del correo inválido.',
      'CONTENIDO_INVALIDO',
    );
  }


  return {
    message: {
      subject: asunto.trim(),
      body: {
        contentType: 'Text',
        content: texto.trim(),
      },
      toRecipients: [
        {
          emailAddress: {
            address: destinatario,
          },
        },
      ],
    },
    saveToSentItems: true,
  };
}


async function enviarCorreo({
  destinatario,
  asunto,
  texto,
} = {}) {
  const correoDestinatario =
    normalizarDestinatario(destinatario);


  const mensaje = construirMensaje({
    destinatario: correoDestinatario,
    asunto,
    texto,
  });


  const sesion = microsoftSesion.obtenerSesion();


  if (!sesion) {
    throw crearError(
      'No hay una sesión Microsoft vigente disponible.',
      'SESION_MICROSOFT_AUSENTE',
    );
  }


  const permisos = Array.isArray(sesion.token?.scopes)
    ? sesion.token.scopes
    : [];


  if (!permisos.includes(PERMISO_ENVIO)) {
    throw crearError(
      'La sesión Microsoft no tiene permiso para enviar correo.',
      'PERMISO_ENVIO_AUSENTE',
    );
  }


  const { remitente } = obtenerConfiguracionMicrosoft();


  if (sesion.cuenta?.username !== remitente) {
    throw crearError(
      'La cuenta autorizada no coincide con el remitente configurado.',
      'CUENTA_REMITENTE_DISTINTA',
    );
  }


  const controlador = new AbortController();


  const temporizador = setTimeout(() => {
    controlador.abort();
  }, TIMEOUT_MS);


  try {
    const respuesta = await fetch(GRAPH_SEND_MAIL_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${sesion.token.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mensaje),
      signal: controlador.signal,
    });


    if (respuesta.status !== 202) {
      throw crearError(
        'Microsoft no aceptó la solicitud de envío.',
        'ENVIO_RECHAZADO',
      );
    }


    return {
      aceptado: true,
      destinatario: correoDestinatario,
    };
  } catch (error) {
    if (error?.codigo) {
      throw error;
    }


    if (error?.name === 'AbortError') {
      throw crearError(
        'Se agotó el tiempo de espera. No se pudo confirmar la aceptación del envío.',
        'TIEMPO_AGOTADO',
      );
    }


    throw crearError(
      'No se pudo confirmar el resultado del envío.',
      'ERROR_ENVIO_CORREO',
    );
  } finally {
    clearTimeout(temporizador);
  }
}


async function enviarCodigoVerificacion({
  destinatario,
  codigo,
  minutosVigencia,
} = {}) {
  if (
    typeof codigo !== 'string' ||
    !/^\d{6}$/.test(codigo)
  ) {
    throw crearError(
      'El código de verificación no tiene el formato esperado.',
      'FORMATO_CODIGO_INVALIDO',
    );
  }


  if (
    !Number.isSafeInteger(minutosVigencia) ||
    minutosVigencia <= 0
  ) {
    throw crearError(
      'Vigencia del código inválida.',
      'VIGENCIA_INVALIDA',
    );
  }


  return enviarCorreo({
    destinatario,
    asunto: 'Saberio: código de verificación',
    texto: [
      'Hola,',
      '',
      `Tu código de verificación para Saberio es: ${codigo}`,
      '',
      `Al solicitar el envío, quedaban aproximadamente ${minutosVigencia} minutos de vigencia.`,
      'La entrega puede tardar. Si el código ya venció, solicita uno nuevo.',
      'No compartas este código con otras personas.',
      '',
      'Si no solicitaste este código, ignora este mensaje.',
      '',
      'Equipo Saberio',
    ].join('\n'),
  });
}


module.exports = {
  enviarCorreo,
  enviarCodigoVerificacion,
};