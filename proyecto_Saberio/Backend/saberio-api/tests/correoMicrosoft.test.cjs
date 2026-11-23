const assert = require('node:assert/strict');


const correoMicrosoft = require('../src/services/correoMicrosoft.service');
const microsoftSesion = require('../src/services/microsoftSesion.service');


const obtenerSesionOriginal =
  microsoftSesion.obtenerSesion;


const resultados = [];


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
  codigoEsperado,
) {
  await assert.rejects(
    operacion,
    (error) => {
      assert.equal(
        error.codigo,
        codigoEsperado,
      );

      return true;
    },
  );
}


async function main() {
  await prueba(
    'Rechaza un código de verificación con formato inválido',
    async () => {
      await assertRechazo(
        () => correoMicrosoft.enviarCodigoVerificacion({
          destinatario: 'estudiante@urosario.edu.co',
          codigo: '12345',
          minutosVigencia: 10,
        }),
        'FORMATO_CODIGO_INVALIDO',
      );


      await assertRechazo(
        () => correoMicrosoft.enviarCodigoVerificacion({
          destinatario: 'estudiante@urosario.edu.co',
          codigo: '1234567',
          minutosVigencia: 10,
        }),
        'FORMATO_CODIGO_INVALIDO',
      );


      await assertRechazo(
        () => correoMicrosoft.enviarCodigoVerificacion({
          destinatario: 'estudiante@urosario.edu.co',
          codigo: 'abcdef',
          minutosVigencia: 10,
        }),
        'FORMATO_CODIGO_INVALIDO',
      );
    },
  );


  await prueba(
    'Rechaza una vigencia inválida',
    async () => {
      await assertRechazo(
        () => correoMicrosoft.enviarCodigoVerificacion({
          destinatario: 'estudiante@urosario.edu.co',
          codigo: '123456',
          minutosVigencia: 0,
        }),
        'VIGENCIA_INVALIDA',
      );


      await assertRechazo(
        () => correoMicrosoft.enviarCodigoVerificacion({
          destinatario: 'estudiante@urosario.edu.co',
          codigo: '123456',
          minutosVigencia: -1,
        }),
        'VIGENCIA_INVALIDA',
      );


      await assertRechazo(
        () => correoMicrosoft.enviarCodigoVerificacion({
          destinatario: 'estudiante@urosario.edu.co',
          codigo: '123456',
          minutosVigencia: 1.5,
        }),
        'VIGENCIA_INVALIDA',
      );
    },
  );


  await prueba(
    'Rechaza un destinatario inválido',
    async () => {
      await assertRechazo(
        () => correoMicrosoft.enviarCodigoVerificacion({
          destinatario: 'correo-invalido',
          codigo: '123456',
          minutosVigencia: 10,
        }),
        'DESTINATARIO_INVALIDO',
      );


      await assertRechazo(
        () => correoMicrosoft.enviarCodigoVerificacion({
          destinatario: '',
          codigo: '123456',
          minutosVigencia: 10,
        }),
        'DESTINATARIO_INVALIDO',
      );


      await assertRechazo(
        () => correoMicrosoft.enviarCodigoVerificacion({
          destinatario: 123,
          codigo: '123456',
          minutosVigencia: 10,
        }),
        'DESTINATARIO_INVALIDO',
      );
    },
  );


  await prueba(
    'Rechaza un asunto inválido',
    async () => {
      await assertRechazo(
        () => correoMicrosoft.enviarCorreo({
          destinatario: 'estudiante@urosario.edu.co',
          asunto: '',
          texto: 'Contenido válido',
        }),
        'ASUNTO_INVALIDO',
      );


      await assertRechazo(
        () => correoMicrosoft.enviarCorreo({
          destinatario: 'estudiante@urosario.edu.co',
          asunto: 'Asunto\ncon salto',
          texto: 'Contenido válido',
        }),
        'ASUNTO_INVALIDO',
      );


      await assertRechazo(
        () => correoMicrosoft.enviarCorreo({
          destinatario: 'estudiante@urosario.edu.co',
          asunto: 'a'.repeat(201),
          texto: 'Contenido válido',
        }),
        'ASUNTO_INVALIDO',
      );
    },
  );


  await prueba(
    'Rechaza un contenido inválido',
    async () => {
      await assertRechazo(
        () => correoMicrosoft.enviarCorreo({
          destinatario: 'estudiante@urosario.edu.co',
          asunto: 'Asunto válido',
          texto: '',
        }),
        'CONTENIDO_INVALIDO',
      );


      await assertRechazo(
        () => correoMicrosoft.enviarCorreo({
          destinatario: 'estudiante@urosario.edu.co',
          asunto: 'Asunto válido',
          texto: 'a'.repeat(20001),
        }),
        'CONTENIDO_INVALIDO',
      );
    },
  );


  await prueba(
    'Rechaza el envío cuando no hay sesión Microsoft',
    async () => {
      microsoftSesion.obtenerSesion = () => null;


      try {
        await assertRechazo(
          () => correoMicrosoft.enviarCodigoVerificacion({
            destinatario: 'estudiante@urosario.edu.co',
            codigo: '123456',
            minutosVigencia: 10,
          }),
          'SESION_MICROSOFT_AUSENTE',
        );
      } finally {
        microsoftSesion.obtenerSesion =
          obtenerSesionOriginal;
      }
    },
  );
  await prueba(
  'Rechaza el envío cuando la sesión no tiene permiso Mail.Send',
  async () => {
    microsoftSesion.obtenerSesion = () => ({
      cuenta: {
        username: 'remitente@outlook.com',
      },
      token: {
        accessToken: 'token-ficticio',
        scopes: [],
      },
      expiraEn: Date.now() + 10 * 60 * 1000,
    });


    try {
      await assertRechazo(
        () => correoMicrosoft.enviarCodigoVerificacion({
          destinatario: 'estudiante@urosario.edu.co',
          codigo: '123456',
          minutosVigencia: 10,
        }),
        'PERMISO_ENVIO_AUSENTE',
      );
    } finally {
      microsoftSesion.obtenerSesion =
        obtenerSesionOriginal;
    }
  },
);


await prueba(
  'Confirma el envío cuando Microsoft Graph responde 202',
  async () => {
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


    const fetchOriginal = global.fetch;


    microsoftSesion.obtenerSesion = () => ({
      cuenta: {
        username: 'remitente@outlook.com',
      },
      token: {
        accessToken: 'token-ficticio',
        scopes: [
          'https://graph.microsoft.com/Mail.Send',
        ],
      },
      expiraEn: Date.now() + 10 * 60 * 1000,
    });


    let solicitudCapturada = null;


    global.fetch = async (url, opciones) => {
      solicitudCapturada = {
        url,
        opciones,
      };


      return {
        status: 202,
      };
    };


    try {
      process.env.MICROSOFT_CLIENT_ID =
        '12345678-1234-1234-1234-123456789012';

      process.env.MICROSOFT_CLIENT_SECRET =
        'secreto-ficticio';

      process.env.MICROSOFT_REDIRECT_URI =
        'http://localhost:3000/api/correo/microsoft/callback';

      process.env.MICROSOFT_SENDER_EMAIL =
        'remitente@outlook.com';


      const resultado =
        await correoMicrosoft.enviarCodigoVerificacion({
          destinatario:
            'Estudiante@Urosario.edu.co',
          codigo: '123456',
          minutosVigencia: 10,
        });


      assert.equal(resultado.aceptado, true);
      assert.equal(
        resultado.destinatario,
        'estudiante@urosario.edu.co',
      );


      assert.equal(
        solicitudCapturada.url,
        'https://graph.microsoft.com/v1.0/me/sendMail',
      );

      assert.equal(
        solicitudCapturada.opciones.method,
        'POST',
      );

      assert.ok(
        solicitudCapturada.opciones.headers
          .Authorization,
      );

      assert.ok(
        solicitudCapturada.opciones.body.includes(
          '123456',
        ),
      );
    } finally {
      global.fetch = fetchOriginal;

      microsoftSesion.obtenerSesion =
        obtenerSesionOriginal;

      for (const [nombre, valor] of
        Object.entries(variablesOriginales)) {
        if (valor === undefined) {
          delete process.env[nombre];
        } else {
          process.env[nombre] = valor;
        }
      }
    }
  },
);


  console.log(
    `Pruebas del servicio de correo superadas: ${resultados.length}`,
  );
}


main()
  .catch((error) => {
    const mensaje = error?.message;


    console.error(
      typeof mensaje === 'string' &&
      mensaje.startsWith('Falló la prueba:')
        ? mensaje
        : 'Falló la preparación de las pruebas del servicio de correo.',
    );


    process.exitCode = 1;
  });