const path = require('node:path');

require('dotenv').config({
  path: path.join(__dirname, '.env'),
  quiet: true,
});

const app = require('./app');

const {
  conectarBaseDeDatos,
} = require('./config/db');

const {
  autorizarMicrosoftLocal,
} = require('./src/services/microsoftAutorizacionLocal.service');

const PORT = Number(process.env.PORT);
const MONGO_URI = process.env.MONGO_URI?.trim();

const AUTORIZACION_LOCAL =
  process.env.MICROSOFT_AUTORIZACION_LOCAL?.trim();

function codigoSeguro(valor) {
  if (typeof valor === 'number') {
    return valor;
  }

  if (
    typeof valor === 'string' &&
    /^[A-Z0-9_]{1,80}$/i.test(valor)
  ) {
    return valor;
  }

  return 'no disponible';
}

function mostrarDiagnostico(error, etapa) {
  console.error(
    'No se pudo completar el arranque de Saberio API.',
  );

  console.error('Etapa:', etapa);

  console.error(
    'Tipo de error:',
    error?.name || 'Desconocido',
  );

  console.error(
    'Código principal:',
    codigoSeguro(error?.code),
  );

  console.error(
    'Código de aplicación:',
    codigoSeguro(error?.codigo),
  );

  const servidores = error?.reason?.servers;

  if (!(servidores instanceof Map)) {
    return;
  }

  let numero = 0;

  for (const servidor of servidores.values()) {
    numero += 1;

    const fallo = servidor.error;

    console.error(`Diagnóstico del servidor ${numero}:`, {
      estado: servidor.type,
      tipoError: fallo?.name || 'sin detalle',
      codigo: codigoSeguro(fallo?.code),
      codigoCausa: codigoSeguro(fallo?.cause?.code),
    });
  }

  if (numero === 0) {
    console.error(
      'No se encontraron servidores en el diagnóstico.',
    );
  }
}

async function iniciarServidor() {
  if (
    !Number.isInteger(PORT) ||
    PORT < 1 ||
    PORT > 65535
  ) {
    console.error(
      'Configura PORT en .env con un número entero entre 1 y 65535.',
    );

    process.exit(1);
  }

  if (!MONGO_URI) {
    console.error(
      'Falta configurar MONGO_URI en el archivo .env.',
    );

    process.exit(1);
  }

  if (
    AUTORIZACION_LOCAL !== undefined &&
    AUTORIZACION_LOCAL !== 'true' &&
    AUTORIZACION_LOCAL !== 'false'
  ) {
    console.error(
      'MICROSOFT_AUTORIZACION_LOCAL debe ser true o false.',
    );

    process.exit(1);
  }

  const autorizarMicrosoft =
    AUTORIZACION_LOCAL === 'true';

  if (
    autorizarMicrosoft &&
    process.env.NODE_ENV === 'production'
  ) {
    console.error(
      'La autorización Microsoft local no está permitida en producción.',
    );

    process.exit(1);
  }

  if (autorizarMicrosoft && PORT !== 3000) {
    console.error(
      'La autorización Microsoft local requiere PORT=3000 para coincidir con el callback configurado.',
    );

    process.exit(1);
  }

  let etapa = 'conexión a MongoDB Atlas';

  try {
    await conectarBaseDeDatos(MONGO_URI);

    if (autorizarMicrosoft) {
      etapa = 'autorización local de Microsoft';

      console.log(
        'Iniciando autorización local de Microsoft.',
      );

      await autorizarMicrosoftLocal();

      console.log(
        'Cuenta remitente autorizada para este proceso.',
      );
    } else {
      console.log(
        'Autorización local de Microsoft desactivada.',
      );
    }

    etapa = 'inicio del servidor HTTP';

    const servidor = app.listen(PORT, () => {
      console.log(
        `Saberio API: http://localhost:${PORT}`,
      );

      console.log(
        `Prueba de salud: http://localhost:${PORT}/api/salud`,
      );
    });

    servidor.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(
          `El puerto ${PORT} ya está ocupado.`,
        );
      } else {
        console.error(
          'No se pudo iniciar el servidor HTTP.',
        );

        console.error(
          'Código:',
          codigoSeguro(error.code),
        );
      }

      process.exit(1);
    });
  } catch (error) {
    // No imprimir URI, tokens, secretos ni el error completo.
    mostrarDiagnostico(error, etapa);

    process.exit(1);
  }
}

iniciarServidor();