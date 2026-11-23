const path = require('node:path');

require('dotenv').config({
  path: path.join(__dirname, '..', '.env'),
  quiet: true,
});

const {
  autorizarMicrosoftLocal,
} = require('../src/services/microsoftAutorizacionLocal.service');

const {
  estaAutorizada,
  cerrarSesion,
} = require('../src/services/microsoftSesion.service');

async function main() {
  try {
    await autorizarMicrosoftLocal();

    if (!estaAutorizada()) {
      throw new Error('SESION_NO_DISPONIBLE');
    }

    console.log('Autorización completada.');
    console.log('Sesión disponible en este proceso: sí.');
    console.log('Esta prueba no envió correos ni conectó a MongoDB.');
  } finally {
    cerrarSesion();
  }
}

main().catch((error) => {
  console.error(
    'No se completó la prueba:',
    error.codigo || 'AUTORIZACION_LOCAL_FALLIDA',
  );

  process.exitCode = 1;
});