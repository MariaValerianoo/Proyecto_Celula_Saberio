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