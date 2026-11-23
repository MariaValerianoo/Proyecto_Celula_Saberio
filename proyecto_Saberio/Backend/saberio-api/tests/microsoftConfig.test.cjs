const assert = require('node:assert/strict');


const {
  obtenerConfiguracionMicrosoft,
  MICROSOFT_SCOPES,
} = require('../config/microsoft');


const variablesOriginales = {
  MICROSOFT_CLIENT_ID:
    process.env.MICROSOFT_CLIENT_ID,
  MICROSOFT_CLIENT_SECRET:
    process.env.MICROSOFT_CLIENT_SECRET,
  MICROSOFT_REDIRECT_URI:
    process.env.MICROSOFT_REDIRECT_URI,
  MICROSOFT_SENDER_EMAIL:
    process.env.MICROSOFT_SENDER_EMAIL,
};


const resultados = [];


function establecerVariables({
  clientId,
  clientSecret,
  redirectUri,
  remitente,
}) {
  process.env.MICROSOFT_CLIENT_ID = clientId;
  process.env.MICROSOFT_CLIENT_SECRET = clientSecret;
  process.env.MICROSOFT_REDIRECT_URI = redirectUri;
  process.env.MICROSOFT_SENDER_EMAIL = remitente;
}


function restaurarVariables() {
  for (const [nombre, valor] of
    Object.entries(variablesOriginales)) {
    if (valor === undefined) {
      delete process.env[nombre];
    } else {
      process.env[nombre] = valor;
    }
  }
}


async function prueba(nombre, ejecutar) {
  try {
    await ejecutar();

    resultados.push(nombre);
    console.log(`OK: ${nombre}`);
  } catch (error) {
    console.error(
      `Error en la prueba: ${nombre}`,
    );

    console.error(error);

    throw new Error(
      `Falló la prueba: ${nombre}`,
    );
  }
}


async function assertRechazo(
  operacion,
  mensajeEsperado,
) {
  let errorCapturado;


  try {
    await operacion();
  } catch (error) {
    errorCapturado = error;
  }


  if (!errorCapturado) {
    throw new Error(
      'Se esperaba un error, pero la operación fue exitosa.',
    );
  }


  assert.equal(
    errorCapturado.message,
    mensajeEsperado,
  );

}


async function main() {
  await prueba(
    'Rechaza la configuración cuando faltan variables',
    async () => {
      establecerVariables({
        clientId: '',
        clientSecret: '',
        redirectUri: '',
        remitente: '',
      });

      await assertRechazo(
        () => obtenerConfiguracionMicrosoft(),
        'Faltan variables de configuración de Microsoft en .env',
      );
    },
  );

  await prueba(
    'Rechaza un CLIENT_ID con formato inválido',
    async () => {
      establecerVariables({
        clientId: 'cliente-invalido',
        clientSecret: 'secreto',
        redirectUri:
          'http://localhost:3000/api/correo/microsoft/callback',
        remitente: 'remitente@outlook.com',
      });

      await assertRechazo(
        () => obtenerConfiguracionMicrosoft(),
        'MICROSOFT_CLIENT_ID no tiene el formato esperado',
      );
    },
  );

  await prueba(
    'Rechaza un REDIRECT_URI distinto al callback local',
    async () => {
      establecerVariables({
        clientId:
          '12345678-1234-1234-1234-123456789012',
        clientSecret: 'secreto',
        redirectUri:
          'http://localhost:3000/otra-ruta',
        remitente: 'remitente@outlook.com',
      });

      await assertRechazo(
        () => obtenerConfiguracionMicrosoft(),
        'Para esta etapa local, MICROSOFT_REDIRECT_URI debe coincidir con el callback configurado',
      );
    },
  );

  await prueba(
    'Rechaza un remitente con formato inválido',
    async () => {
      establecerVariables({
        clientId:
          '12345678-1234-1234-1234-123456789012',
        clientSecret: 'secreto',
        redirectUri:
          'http://localhost:3000/api/correo/microsoft/callback',
        remitente: 'remitente-invalido',
      });

      await assertRechazo(
        () => obtenerConfiguracionMicrosoft(),
        'MICROSOFT_SENDER_EMAIL no tiene un formato válido',
      );
    },
  );

  await prueba(
    'Devuelve una configuración válida',
    async () => {
      establecerVariables({
        clientId:
          '12345678-1234-1234-1234-123456789012',
        clientSecret: 'secreto',
        redirectUri:
          'http://localhost:3000/api/correo/microsoft/callback',
        remitente: 'Remitente@Outlook.com',
      });

      const configuracion =
        obtenerConfiguracionMicrosoft();

      assert.equal(
        configuracion.clientId,
        '12345678-1234-1234-1234-123456789012',
      );

      assert.equal(
        configuracion.clientSecret,
        'secreto',
      );

      assert.equal(
        configuracion.redirectUri,
        'http://localhost:3000/api/correo/microsoft/callback',
      );

      assert.equal(
        configuracion.remitente,
        'remitente@outlook.com',
      );
    },
  );

  await prueba(
    'Expone el permiso necesario para enviar correo',
    async () => {
      assert.deepEqual(
        MICROSOFT_SCOPES,
        [
          'https://graph.microsoft.com/Mail.Send',
        ],
      );
    },
  );

  console.log(
    `Pruebas de configuración de Microsoft superadas: ${resultados.length}`,
  );
}


main()
  .finally(() => {
    restaurarVariables();
  })
  .catch((error) => {
    const mensaje = error?.message;

    console.error(
      typeof mensaje === 'string' &&
      mensaje.startsWith('Falló la prueba:')
        ? mensaje
        : 'Falló la preparación de las pruebas de configuración de Microsoft.',
    );

    process.exitCode = 1;
  });