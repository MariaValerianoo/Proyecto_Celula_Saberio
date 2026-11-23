const assert = require('node:assert/strict');
const HttpError = require('../src/utils/HttpError');

const rutaVerificacion = require.resolve(
  '../src/services/verificacionCorreo.service',
);

const rutaCorreo = require.resolve(
  '../src/services/correoMicrosoft.service',
);

const rutaController = require.resolve(
  '../src/controllers/verificacionCorreo.controller',
);

const rutas = [
  rutaVerificacion,
  rutaCorreo,
  rutaController,
];

const cacheAnterior = new Map(
  rutas.map((ruta) => [ruta, require.cache[ruta]]),
);

let emitirImplementacion;
let verificarImplementacion;
let enviarImplementacion;

function instalarSimulado(ruta, exports) {
  require.cache[ruta] = {
    id: ruta,
    filename: ruta,
    loaded: true,
    exports,
    children: [],
    paths: [],
  };
}

function crearRespuesta() {
  return {
    statusCode: 200,
    cuerpo: undefined,

    status(valor) {
      this.statusCode = valor;
      return this;
    },

    json(valor) {
      this.cuerpo = valor;
      return this;
    },
  };
}

async function ejecutar(handler, body) {
  const res = crearRespuesta();
  let errorRecibido;

  await handler(
    { body },
    res,
    (error) => {
      errorRecibido = error;
    },
  );

  return {
    res,
    error: errorRecibido,
  };
}

async function main() {
  instalarSimulado(rutaVerificacion, {
    emitirCodigo: (...args) =>
      emitirImplementacion(...args),

    verificarCodigo: (...args) =>
      verificarImplementacion(...args),
  });

  instalarSimulado(rutaCorreo, {
    enviarCodigoVerificacion: (...args) =>
      enviarImplementacion(...args),
  });

  delete require.cache[rutaController];

  const {
    solicitarVerificacion,
    confirmarVerificacion,
  } = require(rutaController);

  const resultados = [];

  async function prueba(nombre, fn) {
    await fn();
    resultados.push(nombre);
  }

  await prueba(
    'Rechaza un correo con formato inválido',
    async () => {
      let llamado = false;

      emitirImplementacion = async () => {
        llamado = true;
      };

      const { res, error } = await ejecutar(
        solicitarVerificacion,
        { correo: 'incorrecto' },
      );

      assert.equal(llamado, false);
      assert.ok(error instanceof HttpError);
      assert.equal(error.status, 400);
      assert.equal(error.codigo, 'CORREO_INVALIDO');
      assert.equal(res.cuerpo, undefined);
    },
  );

  await prueba(
    'No envía cuando emitirCodigo devuelve null',
    async () => {
      let enviado = false;

      emitirImplementacion = async () => null;

      enviarImplementacion = async () => {
        enviado = true;
      };

      const { res, error } = await ejecutar(
        solicitarVerificacion,
        { correo: 'prueba@urosario.edu.co' },
      );

      assert.equal(res.statusCode, 200);
      assert.equal(
        typeof res.cuerpo.mensaje,
        'string',
      );
      assert.equal(enviado, false);
      assert.equal(error, undefined);
    },
  );

  await prueba(
    'Envía el código sin devolverlo en la API',
    async () => {
      let recibido;

      emitirImplementacion = async () => ({
        destinatario: 'prueba@urosario.edu.co',
        codigo: '123456',
        venceEn: new Date(
          Date.now() + 5 * 60 * 1000,
        ),
      });

      enviarImplementacion = async (datos) => {
        recibido = datos;

        return {
          aceptado: true,
        };
      };

      const { res, error } = await ejecutar(
        solicitarVerificacion,
        { correo: 'prueba@urosario.edu.co' },
      );

      assert.equal(res.statusCode, 200);
      assert.ok(recibido);
      assert.equal(recibido.codigo, '123456');

      assert.equal(
        recibido.destinatario,
        'prueba@urosario.edu.co',
      );

      assert.ok(recibido.minutosVigencia > 0);
      assert.ok(recibido.minutosVigencia <= 5);

      assert.equal(
        JSON.stringify(res.cuerpo).includes('123456'),
        false,
      );

      assert.equal(error, undefined);
    },
  );

  await prueba(
    'Delega un error 503 si falta la sesión Microsoft',
    async () => {
      emitirImplementacion = async () => ({
        destinatario: 'prueba@urosario.edu.co',
        codigo: '123456',
        venceEn: new Date(
          Date.now() + 5 * 60 * 1000,
        ),
      });

      enviarImplementacion = async () => {
        const error = new Error('Sesión ausente');

        error.codigo = 'SESION_MICROSOFT_AUSENTE';

        throw error;
      };

      const { res, error } = await ejecutar(
        solicitarVerificacion,
        { correo: 'prueba@urosario.edu.co' },
      );

      assert.ok(error instanceof HttpError);
      assert.equal(error.status, 503);

      assert.equal(
        error.codigo,
        'SERVICIO_CORREO_NO_DISPONIBLE',
      );

      assert.equal(res.cuerpo, undefined);
    },
  );

  await prueba(
    'Acepta la confirmación sin exigir resultado.verificado',
    async () => {
      verificarImplementacion = async () => ({
        mensaje: 'Correo verificado correctamente.',
      });

      const { res, error } = await ejecutar(
        confirmarVerificacion,
        {
          correo: 'prueba@urosario.edu.co',
          codigo: '123456',
        },
      );

      assert.equal(res.statusCode, 200);

      assert.equal(
        res.cuerpo.mensaje,
        'Correo verificado correctamente.',
      );

      assert.equal(error, undefined);
    },
  );

  await prueba(
    'Delega CODIGO_NO_VALIDO al middleware',
    async () => {
      const esperado = new HttpError(
        400,
        'El código no es válido, venció o no está disponible',
        'CODIGO_NO_VALIDO',
      );

      verificarImplementacion = async () => {
        throw esperado;
      };

      const { res, error } = await ejecutar(
        confirmarVerificacion,
        {
          correo: 'prueba@urosario.edu.co',
          codigo: '654321',
        },
      );

      assert.equal(error, esperado);
      assert.equal(error.status, 400);
      assert.equal(error.codigo, 'CODIGO_NO_VALIDO');
      assert.equal(res.cuerpo, undefined);
    },
  );

  await prueba(
    'Rechaza un código numérico en lugar de string',
    async () => {
      let llamado = false;

      verificarImplementacion = async () => {
        llamado = true;
      };

      const { res, error } = await ejecutar(
        confirmarVerificacion,
        {
          correo: 'prueba@urosario.edu.co',
          codigo: 123456,
        },
      );

      assert.equal(llamado, false);
      assert.ok(error instanceof HttpError);
      assert.equal(error.status, 400);

      assert.equal(
        error.codigo,
        'DATOS_VERIFICACION_INVALIDOS',
      );

      assert.equal(res.cuerpo, undefined);
    },
  );
    await prueba(
    'Rechaza una solicitud sin body',
    async () => {
      let llamado = false;

      emitirImplementacion = async () => {
        llamado = true;
      };

      const { res, error } = await ejecutar(
        solicitarVerificacion,
        undefined,
      );

      assert.equal(llamado, false);
      assert.ok(error instanceof HttpError);
      assert.equal(error.status, 400);
      assert.equal(error.codigo, 'CORREO_INVALIDO');
      assert.equal(res.cuerpo, undefined);
    },
  );

  await prueba(
    'Rechaza una confirmación sin body',
    async () => {
      let llamado = false;

      verificarImplementacion = async () => {
        llamado = true;
      };

      const { res, error } = await ejecutar(
        confirmarVerificacion,
        undefined,
      );

      assert.equal(llamado, false);
      assert.ok(error instanceof HttpError);
      assert.equal(error.status, 400);

      assert.equal(
        error.codigo,
        'DATOS_VERIFICACION_INVALIDOS',
      );

      assert.equal(res.cuerpo, undefined);
    },
  );

  await prueba(
    'Normaliza el correo antes de solicitar la emisión',
    async () => {
      let correoRecibido;
      let enviado = false;

      emitirImplementacion = async (correo) => {
        correoRecibido = correo;
        return null;
      };

      enviarImplementacion = async () => {
        enviado = true;
      };

      const { res, error } = await ejecutar(
        solicitarVerificacion,
        { correo: '  PRUEBA@UROSARIO.EDU.CO  ' },
      );

      assert.equal(
        correoRecibido,
        'prueba@urosario.edu.co',
      );

      assert.equal(enviado, false);
      assert.equal(res.statusCode, 200);
      assert.equal(error, undefined);
    },
  );

  await prueba(
    'Normaliza la confirmación y conserva el cero inicial',
    async () => {
      let recibido;

      verificarImplementacion = async (datos) => {
        recibido = datos;
      };

      const { res, error } = await ejecutar(
        confirmarVerificacion,
        {
          correo: '  PRUEBA@UROSARIO.EDU.CO  ',
          codigo: ' 012345 ',
        },
      );

      assert.deepEqual(recibido, {
        correo: 'prueba@urosario.edu.co',
        codigo: '012345',
      });

      assert.equal(res.statusCode, 200);
      assert.equal(error, undefined);
    },
  );

  await prueba(
    'No envía una emisión vencida',
    async () => {
      let enviado = false;

      emitirImplementacion = async () => ({
        destinatario: 'prueba@urosario.edu.co',
        codigo: '123456',
        venceEn: new Date(Date.now() - 60 * 1000),
      });

      enviarImplementacion = async () => {
        enviado = true;
      };

      const { res, error } = await ejecutar(
        solicitarVerificacion,
        { correo: 'prueba@urosario.edu.co' },
      );

      assert.equal(enviado, false);
      assert.ok(error instanceof HttpError);
      assert.equal(error.status, 503);

      assert.equal(
        error.codigo,
        'EMISION_NO_DISPONIBLE',
      );

      assert.equal(res.cuerpo, undefined);
    },
  );

  await prueba(
    'No envía una emisión con fecha inválida',
    async () => {
      let enviado = false;

      emitirImplementacion = async () => ({
        destinatario: 'prueba@urosario.edu.co',
        codigo: '123456',
        venceEn: 'fecha-invalida',
      });

      enviarImplementacion = async () => {
        enviado = true;
      };

      const { res, error } = await ejecutar(
        solicitarVerificacion,
        { correo: 'prueba@urosario.edu.co' },
      );

      assert.equal(enviado, false);
      assert.ok(error instanceof HttpError);
      assert.equal(error.status, 503);

      assert.equal(
        error.codigo,
        'EMISION_NO_DISPONIBLE',
      );

      assert.equal(res.cuerpo, undefined);
    },
  );

  await prueba(
    'Delega un fallo de emisión sin intentar enviar',
    async () => {
      const esperado = new Error(
        'Fallo simulado de emisión',
      );

      let enviado = false;

      emitirImplementacion = async () => {
        throw esperado;
      };

      enviarImplementacion = async () => {
        enviado = true;
      };

      const { res, error } = await ejecutar(
        solicitarVerificacion,
        { correo: 'prueba@urosario.edu.co' },
      );

      assert.equal(enviado, false);
      assert.equal(error, esperado);
      assert.equal(res.cuerpo, undefined);
    },
  );

  await prueba(
    'Delega un fallo de envío sin responder éxito',
    async () => {
      const esperado = new Error(
        'Fallo simulado de envío',
      );

      esperado.codigo = 'ERROR_ENVIO_CORREO';

      emitirImplementacion = async () => ({
        destinatario: 'prueba@urosario.edu.co',
        codigo: '123456',
        venceEn: new Date(
          Date.now() + 5 * 60 * 1000,
        ),
      });

      enviarImplementacion = async () => {
        throw esperado;
      };

      const { res, error } = await ejecutar(
        solicitarVerificacion,
        { correo: 'prueba@urosario.edu.co' },
      );

      assert.equal(error, esperado);
      assert.equal(res.cuerpo, undefined);
    },
  );

  for (const nombre of resultados) {
    console.log(`OK: ${nombre}`);
  }

  console.log(
    `Pruebas superadas: ${resultados.length}`,
  );
}

main()
  .catch(() => {
    console.error(
      'Falló una prueba del controlador. Revisa las aserciones localmente.',
    );

    process.exitCode = 1;
  })
  .finally(() => {
    for (const ruta of rutas) {
      const anterior = cacheAnterior.get(ruta);

      if (anterior) {
        require.cache[ruta] = anterior;
      } else {
        delete require.cache[ruta];
      }
    }
  });