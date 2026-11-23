const HttpError = require('../utils/HttpError');

const {
  emitirCodigo,
  verificarCodigo,
} = require('../services/verificacionCorreo.service');

const MENSAJE_SOLICITUD =
  'Si el correo corresponde a una cuenta elegible, se solicitará el envío de un código de verificación.';

function normalizarCorreo(valor) {
  if (typeof valor !== 'string') {
    return null;
  }

  const correo = valor.trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
    return null;
  }

  return correo;
}

function normalizarCodigo(valor) {
  if (typeof valor !== 'string') {
    return null;
  }

  const codigo = valor.trim();

  if (!/^\d{6}$/.test(codigo)) {
    return null;
  }

  return codigo;
}

async function solicitarVerificacion(req, res, next) {
  try {
    const correo = normalizarCorreo(
      req.body?.correo
    );

    if (!correo) {
      throw new HttpError(
        400,
        'Correo inválido.',
        'CORREO_INVALIDO'
      );
    }

    // El servicio genera, guarda y envía el código.
    // No se envía nuevamente desde el controlador.
    await emitirCodigo(correo);

    return res.status(200).json({
      mensaje: MENSAJE_SOLICITUD,
    });
  } catch (error) {
    return next(error);
  }
}

async function confirmarVerificacion(req, res, next) {
  try {
    const correo = normalizarCorreo(
      req.body?.correo
    );

    const codigo = normalizarCodigo(
      req.body?.codigo
    );

    if (!correo || !codigo) {
      throw new HttpError(
        400,
        'Correo o código inválido.',
        'DATOS_VERIFICACION_INVALIDOS'
      );
    }

    await verificarCodigo({
      correo,
      codigo,
    });

    return res.status(200).json({
      mensaje: 'Correo verificado correctamente.',
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  solicitarVerificacion,
  confirmarVerificacion,
};