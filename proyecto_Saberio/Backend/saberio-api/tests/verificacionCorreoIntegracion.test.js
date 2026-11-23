const assert = require('node:assert/strict');
const mongoose = require('mongoose');


const {
  randomBytes,
} = require('node:crypto');


const URI_LOCAL =
  'mongodb://127.0.0.1:27017/saberio_verificacion_test';


const BASE_PRUEBAS =
  'saberio_verificacion_test';


const claveAnterior =
  process.env.EMAIL_VERIFICATION_SECRET;


const usuariosCreados = [];


let conexionValidada = false;


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
    '127.0.0.1',
  );


  assert.equal(
    mongoose.connection.port,
    27017,
  );


  assert.equal(
    mongoose.connection.name,
    BASE_PRUEBAS,
  );


  conexionValidada = true;


  const Usuario = require('../models/usuario.model');


  const {
    emitirCodigo,
    verificarCodigo,
  } = require('../src/services/verificacionCorreo.service');


  const {
    coincideCodigo,
  } = require('../src/utils/codigoVerificacion');


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


  async function crearUsuario() {
    const id = new mongoose.Types.ObjectId();


    // Registrar el ID antes de insertar para poder limpiarlo.
    usuariosCreados.push(id);


    return Usuario.create({
      _id: id,
      nombre: 'Usuario de integración',
      correo: `integracion.${id}@urosario.edu.co`,


      // Dato ficticio: estas pruebas no prueban login.
      passwordHash:
        'hash-ficticio-no-utilizable-para-login',


      roles: ['estudiante'],
      correoVerificado: false,
      estadoCuenta: 'habilitada',
      acreditacionMonitor: 'no_solicitada',
    });
  }


  await prueba(
    'Emite y guarda la huella del código en MongoDB local',
    async () => {
      const usuario = await crearUsuario();


      const emision = await emitirCodigo(
        usuario.correo,
      );


      assert.ok(emision);


      assert.equal(
        emision.destinatario,
        usuario.correo,
      );


      assert.match(
        emision.codigo,
        /^\d{6}$/,
      );


      const guardado = await Usuario.findById(
        usuario._id,
      )
        .select('+verificacionCorreo')
        .lean();


      assert.ok(guardado);


      assert.equal(
        guardado.correoVerificado,
        false,
      );


      const verificacion =
        guardado.verificacionCorreo;


      assert.ok(verificacion);


      assert.match(
        verificacion.huella,
        /^[a-f0-9]{64}$/,
      );


      assert.match(
        verificacion.nonce,
        /^[a-f0-9]{32}$/,
      );


      assert.equal(
        verificacion.intentos,
        0,
      );


      assert.equal(
        verificacion.venceEn.getTime() -
          verificacion.creadoEn.getTime(),
        10 * 60 * 1000,
      );


      assert.equal(
        emision.venceEn.getTime(),
        verificacion.venceEn.getTime(),
      );


      assert.equal(
        Object.hasOwn(verificacion, 'codigo'),
        false,
      );


      assert.equal(
        coincideCodigo({
          usuarioId: guardado._id,
          codigo: emision.codigo,
          nonce: verificacion.nonce,
          huella: verificacion.huella,
        }),
        true,
      );
    },
  );


  await prueba(
    'Bloquea un reenvío inmediato sin reemplazar la emisión',
    async () => {
      const usuario = await crearUsuario();


      const primeraEmision = await emitirCodigo(
        usuario.correo,
      );


      assert.ok(primeraEmision);


      const antes = await Usuario.findById(
        usuario._id,
      )
        .select('+verificacionCorreo')
        .lean();


      assert.ok(antes?.verificacionCorreo);


      const segundaEmision = await emitirCodigo(
        usuario.correo,
      );


      assert.equal(
        segundaEmision,
        null,
      );


      const despues = await Usuario.findById(
        usuario._id,
      )
        .select('+verificacionCorreo')
        .lean();


      assert.ok(despues?.verificacionCorreo);


      assert.deepEqual(
        despues.verificacionCorreo,
        antes.verificacionCorreo,
      );


      assert.equal(
        coincideCodigo({
          usuarioId: despues._id,
          codigo: primeraEmision.codigo,
          nonce: despues.verificacionCorreo.nonce,
          huella: despues.verificacionCorreo.huella,
        }),
        true,
      );
    },
  );


  await prueba(
    'Confirma el correo y elimina la emisión guardada',
    async () => {
      const usuario = await crearUsuario();


      const emision = await emitirCodigo(
        usuario.correo,
      );


      assert.ok(emision);


      const resultado = await verificarCodigo({
        correo: usuario.correo,
        codigo: emision.codigo,
      });


      assert.deepEqual(resultado, {
        mensaje:
          'Correo verificado correctamente. Ya puedes iniciar sesión.',
      });


      const guardado = await Usuario.findById(
        usuario._id,
      )
        .select('+verificacionCorreo')
        .lean();


      assert.ok(guardado);


      assert.equal(
        guardado.correoVerificado,
        true,
      );


      assert.ok(
        guardado.correoVerificadoEn instanceof Date,
      );


      assert.equal(
        Object.hasOwn(
          guardado,
          'verificacionCorreo',
        ),
        false,
      );
    },
  );


  await prueba(
    'Rechaza el segundo uso de un código ya consumido',
    async () => {
      const usuario = await crearUsuario();


      const emision = await emitirCodigo(
        usuario.correo,
      );


      assert.ok(emision);


      await verificarCodigo({
        correo: usuario.correo,
        codigo: emision.codigo,
      });


      const antes = await Usuario.findById(
        usuario._id,
      )
        .select('+verificacionCorreo')
        .lean();


      assert.ok(antes);


      assert.equal(
        antes.correoVerificado,
        true,
      );


      await assert.rejects(
        () => verificarCodigo({
          correo: usuario.correo,
          codigo: emision.codigo,
        }),
        (error) => {
          assert.equal(
            error.codigo,
            'CODIGO_NO_VALIDO',
          );


          assert.equal(
            error.status,
            400,
          );


          return true;
        },
      );


      const despues = await Usuario.findById(
        usuario._id,
      )
        .select('+verificacionCorreo')
        .lean();


      assert.ok(despues);


      assert.equal(
        despues.correoVerificado,
        true,
      );


      assert.equal(
        despues.correoVerificadoEn.getTime(),
        antes.correoVerificadoEn.getTime(),
      );


      assert.equal(
        Object.hasOwn(
          despues,
          'verificacionCorreo',
        ),
        false,
      );
    },
  );


  await prueba(
    'Rechaza un código vencido sin consumir un intento',
    async () => {
      const usuario = await crearUsuario();


      const emision = await emitirCodigo(
        usuario.correo,
      );


      assert.ok(emision);


      const ahora = Date.now();


      const ajuste = await Usuario.updateOne(
        { _id: usuario._id },
        {
          $set: {
            'verificacionCorreo.creadoEn':
              new Date(ahora - 11 * 60 * 1000),


            'verificacionCorreo.venceEn':
              new Date(ahora - 60 * 1000),
          },
        },
        { runValidators: true },
      );


      assert.equal(ajuste.matchedCount, 1);
      assert.equal(ajuste.modifiedCount, 1);


      await assert.rejects(
        () => verificarCodigo({
          correo: usuario.correo,
          codigo: emision.codigo,
        }),
        (error) => {
          assert.equal(
            error.codigo,
            'CODIGO_NO_VALIDO',
          );


          assert.equal(error.status, 400);


          return true;
        },
      );


      const guardado = await Usuario.findById(
        usuario._id,
      )
        .select('+verificacionCorreo')
        .lean();


      assert.ok(guardado);
      assert.equal(guardado.correoVerificado, false);
      assert.equal(guardado.correoVerificadoEn, null);
      assert.ok(guardado.verificacionCorreo);


      assert.equal(
        guardado.verificacionCorreo.intentos,
        0,
      );
    },
  );


  await prueba(
    'Bloquea el código correcto después de cinco intentos incorrectos',
    async () => {
      const usuario = await crearUsuario();


      const emision = await emitirCodigo(
        usuario.correo,
      );


      assert.ok(emision);


      const codigoIncorrecto = (
        (Number(emision.codigo) + 1) % 1000000
      )
        .toString()
        .padStart(6, '0');


      for (let intento = 1; intento <= 5; intento += 1) {
        await assert.rejects(
          () => verificarCodigo({
            correo: usuario.correo,
            codigo: codigoIncorrecto,
          }),
          (error) => {
            assert.equal(
              error.codigo,
              'CODIGO_NO_VALIDO',
            );


            assert.equal(error.status, 400);


            return true;
          },
        );


        const actualizado = await Usuario.findById(
          usuario._id,
        )
          .select('+verificacionCorreo')
          .lean();


        assert.ok(actualizado);
        assert.equal(
          actualizado.correoVerificado,
          false,
        );


        assert.ok(actualizado.verificacionCorreo);


        assert.equal(
          actualizado.verificacionCorreo.intentos,
          intento,
        );
      }


      // Aunque ahora se presente el código correcto,
      // esta emisión ya agotó sus cinco intentos.
      await assert.rejects(
        () => verificarCodigo({
          correo: usuario.correo,
          codigo: emision.codigo,
        }),
        (error) => {
          assert.equal(
            error.codigo,
            'CODIGO_NO_VALIDO',
          );


          assert.equal(error.status, 400);


          return true;
        },
      );


      const guardado = await Usuario.findById(
        usuario._id,
      )
        .select('+verificacionCorreo')
        .lean();


      assert.ok(guardado);
      assert.equal(guardado.correoVerificado, false);
      assert.equal(guardado.correoVerificadoEn, null);
      assert.ok(guardado.verificacionCorreo);


      assert.equal(
        guardado.verificacionCorreo.intentos,
        5,
      );
    },
  );


  await prueba(
    'Permite reenviar después de la espera y reemplaza la emisión anterior',
    async () => {
      const usuario = await crearUsuario();


      const primeraEmision = await emitirCodigo(
        usuario.correo,
      );


      assert.ok(primeraEmision);


      const antes = await Usuario.findById(
        usuario._id,
      )
        .select('+verificacionCorreo')
        .lean();


      assert.ok(antes?.verificacionCorreo);


      // Simular que ya transcurrió más de un minuto.
      const ajuste = await Usuario.updateOne(
        { _id: usuario._id },
        {
          $set: {
            'verificacionCorreo.creadoEn':
              new Date(Date.now() - 61 * 1000),


            'verificacionCorreo.intentos': 3,
          },
        },
        { runValidators: true },
      );


      assert.equal(ajuste.matchedCount, 1);
      assert.equal(ajuste.modifiedCount, 1);


      const segundaEmision = await emitirCodigo(
        usuario.correo,
      );


      assert.ok(segundaEmision);


      assert.equal(
        segundaEmision.destinatario,
        usuario.correo,
      );


      assert.match(
        segundaEmision.codigo,
        /^\d{6}$/,
      );


      const despues = await Usuario.findById(
        usuario._id,
      )
        .select('+verificacionCorreo')
        .lean();


      assert.ok(despues?.verificacionCorreo);


      const anterior = antes.verificacionCorreo;
      const nueva = despues.verificacionCorreo;


      assert.notEqual(
        nueva.nonce,
        anterior.nonce,
      );


      assert.notEqual(
        nueva.huella,
        anterior.huella,
      );


      assert.equal(nueva.intentos, 0);
      assert.equal(despues.correoVerificado, false);


      assert.equal(
        nueva.venceEn.getTime() -
          nueva.creadoEn.getTime(),
        10 * 60 * 1000,
      );


      assert.equal(
        coincideCodigo({
          usuarioId: despues._id,
          codigo: segundaEmision.codigo,
          nonce: nueva.nonce,
          huella: nueva.huella,
        }),
        true,
      );


      assert.equal(
        coincideCodigo({
          usuarioId: despues._id,
          codigo: primeraEmision.codigo,
          nonce: anterior.nonce,
          huella: nueva.huella,
        }),
        false,
      );
    },
  );


  await prueba(
    'Solo una de dos confirmaciones simultáneas tiene éxito',
    async () => {
      const usuario = await crearUsuario();


      const emision = await emitirCodigo(
        usuario.correo,
      );


      assert.ok(emision);


      const respuestas = await Promise.allSettled([
        verificarCodigo({
          correo: usuario.correo,
          codigo: emision.codigo,
        }),


        verificarCodigo({
          correo: usuario.correo,
          codigo: emision.codigo,
        }),
      ]);


      const exitosas = respuestas.filter(
        (respuesta) =>
          respuesta.status === 'fulfilled',
      );


      const rechazadas = respuestas.filter(
        (respuesta) =>
          respuesta.status === 'rejected',
      );


      assert.equal(exitosas.length, 1);
      assert.equal(rechazadas.length, 1);


      assert.deepEqual(exitosas[0].value, {
        mensaje:
          'Correo verificado correctamente. Ya puedes iniciar sesión.',
      });


      assert.equal(
        rechazadas[0].reason.codigo,
        'CODIGO_NO_VALIDO',
      );


      assert.equal(
        rechazadas[0].reason.status,
        400,
      );


      const guardado = await Usuario.findById(
        usuario._id,
      )
        .select('+verificacionCorreo')
        .lean();


      assert.ok(guardado);
      assert.equal(guardado.correoVerificado, true);


      assert.ok(
        guardado.correoVerificadoEn instanceof Date,
      );


      assert.equal(
        Object.hasOwn(guardado, 'verificacionCorreo'),
        false,
      );
    },
  );


  await prueba(
    'Los intentos incorrectos simultáneos no superan el límite de cinco',
    async () => {
      const usuario = await crearUsuario();


      const emision = await emitirCodigo(
        usuario.correo,
      );


      assert.ok(emision);


      const codigoIncorrecto = (
        (Number(emision.codigo) + 1) % 1000000
      )
        .toString()
        .padStart(6, '0');


      const operaciones = Array.from(
        { length: 8 },
        () => verificarCodigo({
          correo: usuario.correo,
          codigo: codigoIncorrecto,
        }),
      );


      const respuestas = await Promise.allSettled(
        operaciones,
      );


      assert.equal(respuestas.length, 8);


      for (const respuesta of respuestas) {
        assert.equal(
          respuesta.status,
          'rejected',
        );


        assert.equal(
          respuesta.reason.codigo,
          'CODIGO_NO_VALIDO',
        );


        assert.equal(
          respuesta.reason.status,
          400,
        );
      }


      const guardado = await Usuario.findById(
        usuario._id,
      )
        .select('+verificacionCorreo')
        .lean();


      assert.ok(guardado);
      assert.equal(guardado.correoVerificado, false);
      assert.equal(guardado.correoVerificadoEn, null);
      assert.ok(guardado.verificacionCorreo);


      assert.equal(
        guardado.verificacionCorreo.intentos,
        5,
      );


      await assert.rejects(
        () => verificarCodigo({
          correo: usuario.correo,
          codigo: emision.codigo,
        }),
        (error) => {
          assert.equal(
            error.codigo,
            'CODIGO_NO_VALIDO',
          );


          assert.equal(error.status, 400);


          return true;
        },
      );
    },
  );


  await prueba(
    'Permite el sexto reenvío después de la espera y bloquea el séptimo',
    async () => {
      const usuario = await crearUsuario();


      const primeraEmision = await emitirCodigo(
        usuario.correo,
      );


      assert.ok(primeraEmision);


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
                  Date.now() - 61 * 1000,
                ),
            },
          },
          { runValidators: true },
        );


        assert.equal(ajuste.matchedCount, 1);
        assert.equal(ajuste.modifiedCount, 1);


        const emision = await emitirCodigo(
          usuario.correo,
        );


        assert.ok(emision);


        assert.equal(
          emision.destinatario,
          usuario.correo,
        );


        assert.match(
          emision.codigo,
          /^\d{6}$/,
        );
      }


      const guardado = await Usuario.findById(
        usuario._id,
      )
        .select('+verificacionCorreo')
        .lean();


      assert.ok(guardado?.verificacionCorreo);


      assert.equal(
        guardado.verificacionCorreo.reenvios,
        6,
      );


      const ajuste = await Usuario.updateOne(
        { _id: usuario._id },
        {
          $set: {
            'verificacionCorreo.creadoEn':
              new Date(Date.now() - 61 * 1000),
          },
        },
        { runValidators: true },
      );


      assert.equal(ajuste.matchedCount, 1);
      assert.equal(ajuste.modifiedCount, 1);


      await assert.rejects(
        () => emitirCodigo(usuario.correo),
        (error) => {
          assert.equal(
            error.codigo,
            'REENVIO_NO_DISPONIBLE',
          );


          assert.equal(error.status, 429);


          assert.equal(
            error.detalles.limite,
            6,
          );


          assert.ok(
            error.detalles.reintentarEn > 0,
          );


          return true;
        },
      );


      const final = await Usuario.findById(
        usuario._id,
      )
        .select('+verificacionCorreo')
        .lean();


      assert.ok(final?.verificacionCorreo);


      assert.equal(
        final.verificacionCorreo.reenvios,
        6,
      );
    },
  );


  console.log(
    `Pruebas de integración superadas: ${resultados.length}`,
  );
}


main()
  .catch((error) => {
    const mensaje = error?.message;


    console.error(
      typeof mensaje === 'string' &&
      mensaje.startsWith('Falló la prueba:')
        ? mensaje
        : 'Falló la preparación de la integración local.',
    );


    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      if (
        conexionValidada &&
        mongoose.connection.readyState === 1 &&
        usuariosCreados.length > 0
      ) {
        // Solo elimina los IDs reservados por esta ejecución.
        await mongoose.connection.db
          .collection('usuarios')
          .deleteMany({
            _id: {
              $in: usuariosCreados,
            },
          });
      }
    } catch {
      console.error(
        'No se pudo completar la limpieza de los usuarios de prueba.',
      );


      process.exitCode = 1;
    } finally {
      try {
        await mongoose.disconnect();
      } catch {
        console.error(
          'No se pudo cerrar la conexión local.',
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