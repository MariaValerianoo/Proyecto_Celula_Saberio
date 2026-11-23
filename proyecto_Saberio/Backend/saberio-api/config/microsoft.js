const { ConfidentialClientApplication } = require('@azure/msal-node');

let clienteMicrosoft;

function obtenerConfiguracionMicrosoft() {
  const clientId = process.env.MICROSOFT_CLIENT_ID?.trim();
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  const redirectUri =
    process.env.MICROSOFT_REDIRECT_URI?.trim();
  const remitente =
    process.env.MICROSOFT_SENDER_EMAIL?.trim().toLowerCase();

  if (!clientId || !clientSecret || !redirectUri || !remitente) {
    throw new Error(
      'Faltan variables de configuración de Microsoft en .env'
    );
  }

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      clientId
    )
  ) {
    throw new Error(
      'MICROSOFT_CLIENT_ID no tiene el formato esperado'
    );
  }

  const callbackLocal =
    'http://localhost:3000/api/correo/microsoft/callback';
  const callbackProduccion =
    'https://saberio-api.vercel.app/api/correo/microsoft/callback';

  const callbackPermitido =
    process.env.NODE_ENV === 'production'
      ? callbackProduccion
      : callbackLocal;

  if (redirectUri !== callbackPermitido) {
    throw new Error(
      'MICROSOFT_REDIRECT_URI no coincide con el callback configurado para este entorno.'
    );
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(remitente)) {
    throw new Error(
      'MICROSOFT_SENDER_EMAIL no tiene un formato válido'
    );
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
    remitente,
    scopes: [
      'https://graph.microsoft.com/Mail.Send',
      'offline_access',
    ],
  };
}

function obtenerClienteMicrosoft() {
  if (!clienteMicrosoft) {
    const configuracion = obtenerConfiguracionMicrosoft();

    clienteMicrosoft = new ConfidentialClientApplication({
      auth: {
        clientId: configuracion.clientId,
        clientSecret: configuracion.clientSecret,
        authority:
          'https://login.microsoftonline.com/consumers',
      },
    });
  }

  return clienteMicrosoft;
}

module.exports = {
  obtenerConfiguracionMicrosoft,
  obtenerClienteMicrosoft,
};
