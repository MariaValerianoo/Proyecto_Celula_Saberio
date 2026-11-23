const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const request = require('supertest');
const { randomBytes } = require('node:crypto');

const URI_LOCAL =
  'mongodb://127.0.0.1:27017/saberio_verificacion_test';

const BASE_PRUEBAS =
  'saberio_verificacion_test';

const claveAnterior =
  process.env.EMAIL_VERIFICATION_SECRET;

const usuariosCreados = [];

let conexionValidada = false;
let aplicacion;
let restaurarEnvios = () => {};

async function main() {
  // No cargar dotenv ni importar server.js.
  process.env.EMAIL_VERIFICATION_SECRET =
    randomBytes(32).toString('hex');

  await mongoose.connect(URI_LOCAL, {
    serverSelectionTimeoutMS: 3000,
    connectTimeoutMS: 3000,
    autoCreate: false,
    autoIndex: false,
  });

  assert.equal(
    mongoose.connection.host,
    '127.0.0.1'
  );

  assert.equal(
    mongoose.connection.port,
    27017
  );

  assert.equal(
    mongoose.connection.name,
    BASE_PRUEBAS
  );

  conexionValidada = true;

  const Usuario = require('../models/usuario.model');

  // Simular los puntos de envío antes de cargar la aplicación.
  const notificacion = require(
    '../src/services/notificacion.service'
  );

  const correoMicrosoft = require(
    '../src/services/correoMicrosoft.service'
  );

  const envioNotificacionAnterior =
    Object.getOwnPropertyDescriptor(
      notificacion,
      'enviarCodigoVerificacion'
    );

  const envioMicrosoftAnterior =
    Object.getOwnPropertyDescriptor(
      correoMicrosoft,
      'enviarCodigoVerificacion'
    );

  restaurarEnvios = () => {
    if (envioNotificacionAnterior) {
      Object.defineProperty(
        notificacion,
        'enviarCodigoVerificacion',
        envioNotificacionAnterior
      );
    } else {
      delete notificacion.enviarCodigoVerificacion;
    }

    if (envioMicrosoftAnterior) {
      Object.defineProperty(
        correoMicrosoft,
        'enviarCodigoVerificacion',
        envioMicrosoftAnterior
      );
    } else {
      delete correoMicrosoft.enviarCodigoVerificacion;
    }
  };

  let correosSimulados = [];

  const simularEnvio = async (datos) => {
    correosSimulados.push(datos);

    return {
      aceptado: true,
    };
  };

  notificacion.enviarCodigoVerificacion =
    simularEnvio;

  correoMicrosoft.enviarCodigoVerificacion =
    simularEnvio;

  aplicacion = require('../app');

  const {
    emitirCodigo,
  } = require(
    '../src/services/verificacionCorreo.service'
  );

  const resultados = [];

  async function prueba(nombre, ejecutar) {
    correosSimulados = [];

    try {
      await ejecutar();

      resultados.push(nombre);
      console.log(`OK: ${nombre}`);
    } catch (error) {
      throw new Error(
        `Falló la prueba: ${nombre}`,
        { cause: error }
      );
    }
  }

  async function crearUsuario() {
    const id = new mongoose.Types.ObjectId();

    usuariosCreados.push(id);

    return Usuario.create({
      _id: id,
      nombre: 'Usuario HTTP de integración',
      correo: `http.${id}@urosario.edu.co`,
      passwordHash:
        'hash-ficticio-no-utilizable-para-login',
      roles: ['estudiante'],
      correoVerificado: false,
      estadoCuenta: 'habilitada',
      acreditacionMonitor: 'no_solicitada',
    });
  }

  await prueba(
    'Solicita un código mediante la ruta HTTP sin enviar correo real',
    async () => {
      const usuario = await crearUsuario();

      const respuesta = await request(aplicacion)
        .post('/api/verificacion/solicitar')
        .send({
          correo: usuario.correo,
        });

      assert.equal(respuesta.status, 200);

      assert.equal(
        respuesta.body.mensaje,
        'Si el correo corresponde a una cuenta elegible, se solicitará el envío de un código de verificación.'
      );

      assert.equal(
        respuesta.body.codigo,
        undefined
      );

      assert.equal(
        correosSimulados.length,
        1,
        'Debe enviarse exactamente un correo por emisión'
      );

      assert.equal(
        correosSimulados[0].destinatario,
        usuario.correo
      );

      assert.match(
        correosSimulados[0].codigo,
        /^\d{6}$/
      );

      const guardado = await Usuario.findById(
        usuario._id
      )
        .select('+verificacionCorreo')
        .lean();

      assert.ok(guardado?.verificacionCorreo);

      assert.match(
        guardado.verificacionCorreo.huella,
        /^[a-f0-9]{64}$/
      );

      assert.equal(
        guardado.verificacionCorreo.intentos,
        0
      );

      assert.equal(
        guardado.verificacionCorreo.reenvios,
        0
      );
    }
  );

  await prueba(
    'Confirma el correo mediante la ruta HTTP',
    async () => {
      const usuario = await crearUsuario();

      const emision = await emitirCodigo(
        usuario.correo
      );

      assert.ok(emision);
      assert.equal(emision.codigo, undefined);
      assert.equal(correosSimulados.length, 1);

      const correoEnviado = correosSimulados[0];

      assert.equal(
        correoEnviado.destinatario,
        usuario.correo
      );

      assert.match(
        correoEnviado.codigo,
        /^\d{6}$/
      );

      const respuesta = await request(aplicacion)
        .post('/api/verificacion/confirmar')
        .send({
          correo: usuario.correo,
          codigo: correoEnviado.codigo,
        });

      assert.equal(respuesta.status, 200);

      assert.equal(
        respuesta.body.mensaje,
        'Correo verificado correctamente.'
      );

      const final = await Usuario.findById(
        usuario._id
      )
        .select('+verificacionCorreo')
        .lean();

      assert.ok(final);

      assert.equal(
        final.correoVerificado,
        true
      );

      assert.ok(
        final.correoVerificadoEn instanceof Date
      );

      assert.equal(
        Object.hasOwn(
          final,
          'verificacionCorreo'
        ),
        false
      );
    }
  );

  await prueba(
    'Rechaza un código incorrecto mediante la ruta HTTP',
    async () => {
      const usuario = await crearUsuario();

      const emision = await emitirCodigo(
        usuario.correo
      );

      assert.ok(emision);
      assert.equal(correosSimulados.length, 1);

      const codigoEnviado =
        correosSimulados[0].codigo;

      assert.match(
        codigoEnviado,
        /^\d{6}$/
      );

      const codigoIncorrecto = (
        (Number(codigoEnviado) + 1) % 1000000
      )
        .toString()
        .padStart(6, '0');

      const respuesta = await request(aplicacion)
        .post('/api/verificacion/confirmar')
        .send({
          correo: usuario.correo,
          codigo: codigoIncorrecto,
        });

      assert.equal(respuesta.status, 400);

      assert.equal(
        respuesta.body.error.codigo,
        'CODIGO_NO_VALIDO'
      );

      assert.equal(
        respuesta.body.error.mensaje,
        'El código no es válido, venció o no está disponible'
      );

      const guardado = await Usuario.findById(
        usuario._id
      )
        .select('+verificacionCorreo')
        .lean();

      assert.ok(guardado?.verificacionCorreo);

      assert.equal(
        guardado.verificacionCorreo.intentos,
        1
      );

      assert.equal(
        guardado.correoVerificado,
        false
      );
    }
  );

  await prueba(
    'Rechaza el séptimo reenvío mediante la ruta HTTP',
    async () => {
      const usuario = await crearUsuario();

      const primera = await request(aplicacion)
        .post('/api/verificacion/solicitar')
        .send({
          correo: usuario.correo,
        });

      assert.equal(primera.status, 200);
      assert.equal(correosSimulados.length, 1);

      for (
        let reenvio = 1;
        reenvio <= 6;
        reenvio += 1
      ) {
        const ajuste = await Usuario.updateOne(
          { _id: usuario._id },
          {
            $set: {
              'verificacionCorreo.creadoEn':
                new Date(
                  Date.now() - 61 * 1000
                ),
            },
          },
          { runValidators: true }
        );

        assert.equal(
          ajuste.matchedCount,
          1
        );

        assert.equal(
          ajuste.modifiedCount,
          1
        );

        const reenvioHttp = await request(aplicacion)
          .post('/api/verificacion/solicitar')
          .send({
            correo: usuario.correo,
          });

        assert.equal(
          reenvioHttp.status,
          200
        );

        assert.equal(
          correosSimulados.length,
          reenvio + 1,
          'Cada reenvío permitido debe generar un solo correo'
        );
      }

      const ajuste = await Usuario.updateOne(
        { _id: usuario._id },
        {
          $set: {
            'verificacionCorreo.creadoEn':
              new Date(
                Date.now() - 61 * 1000
              ),
          },
        },
        { runValidators: true }
      );

      assert.equal(
        ajuste.matchedCount,
        1
      );

      assert.equal(
        ajuste.modifiedCount,
        1
      );

      const septimo = await request(aplicacion)
        .post('/api/verificacion/solicitar')
        .send({
          correo: usuario.correo,
        });

      assert.equal(septimo.status, 429);

      assert.equal(
        septimo.body.error.codigo,
        'REENVIO_NO_DISPONIBLE'
      );

      assert.equal(
        septimo.body.error.mensaje,
        'Se alcanzó el límite de reenvíos del código de verificación'
      );

      assert.equal(
        septimo.body.error.detalles.limite,
        6
      );

      assert.ok(
        septimo.body.error.detalles.reintentarEn > 0
      );

      assert.equal(
        correosSimulados.length,
        7,
        'El séptimo reenvío rechazado no debe enviar correo'
      );

      const guardado = await Usuario.findById(
        usuario._id
      )
        .select('+verificacionCorreo')
        .lean();

      assert.ok(guardado?.verificacionCorreo);

      assert.equal(
        guardado.verificacionCorreo.reenvios,
        6
      );
    }
  );

  await prueba(
    'Rechaza una solicitud con correo inválido',
    async () => {
      const respuesta = await request(aplicacion)
        .post('/api/verificacion/solicitar')
        .send({
          correo: 'correo-invalido',
        });

      assert.equal(respuesta.status, 400);

      assert.equal(
        respuesta.body.error.codigo,
        'CORREO_INVALIDO'
      );

      assert.equal(
        respuesta.body.error.mensaje,
        'Correo inválido.'
      );

      assert.equal(correosSimulados.length, 0);
    }
  );

  await prueba(
    'Rechaza una confirmación con datos inválidos',
    async () => {
      const respuesta = await request(aplicacion)
        .post('/api/verificacion/confirmar')
        .send({
          correo: 'correo-invalido',
          codigo: '12345',
        });

      assert.equal(respuesta.status, 400);

      assert.equal(
        respuesta.body.error.codigo,
        'DATOS_VERIFICACION_INVALIDOS'
      );

      assert.equal(
        respuesta.body.error.mensaje,
        'Correo o código inválido.'
      );

      assert.equal(correosSimulados.length, 0);
    }
  );

  await prueba(
    'Rechaza una ruta inexistente',
    async () => {
      const respuesta = await request(aplicacion)
        .post('/api/verificacion/ruta-inexistente')
        .send({});

      assert.equal(respuesta.status, 404);

      assert.equal(
        respuesta.body.error.codigo,
        'RUTA_NO_ENCONTRADA'
      );

      assert.equal(correosSimulados.length, 0);
    }
  );

  await prueba(
    'Rechaza un cuerpo JSON inválido',
    async () => {
      const respuesta = await request(aplicacion)
        .post('/api/verificacion/solicitar')
        .set(
          'Content-Type',
          'application/json'
        )
        .send('{correo:');

      assert.equal(respuesta.status, 400);

      assert.equal(
        respuesta.body.error.codigo,
        'JSON_INVALIDO'
      );

      assert.equal(
        respuesta.body.error.mensaje,
        'El cuerpo de la petición contiene JSON inválido'
      );

      assert.equal(correosSimulados.length, 0);
    }
  );

  console.log(
    `Pruebas HTTP superadas: ${resultados.length}`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      if (
        conexionValidada &&
        mongoose.connection.readyState === 1 &&
        usuariosCreados.length > 0
      ) {
        const Usuario = require(
          '../models/usuario.model'
        );

        // Eliminar solo los usuarios creados por este archivo.
        await Usuario.deleteMany({
          _id: {
            $in: usuariosCreados,
          },
        });
      }
    } catch (error) {
      console.error(
        'No se pudo completar la limpieza de los usuarios HTTP de prueba.',
        error
      );

      process.exitCode = 1;
    } finally {
      try {
        restaurarEnvios();
      } catch (error) {
        console.error(
          'No se pudieron restaurar los servicios de correo.',
          error
        );

        process.exitCode = 1;
      }

      try {
        await mongoose.disconnect();
      } catch (error) {
        console.error(
          'No se pudo cerrar la conexión local.',
          error
        );

        process.exitCode = 1;
      }

      if (claveAnterior === undefined) {
        delete process.env.EMAIL_VERIFICATION_SECRET;
      } else {
        process.env.EMAIL_VERIFICATION_SECRET =
          claveAnterior;
      }
    }
  });