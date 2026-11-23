const HttpError = require('../utils/HttpError');

const CAMPOS_PERMITIDOS = [
  'sesion',
  'calificacion',
  'comentario',
];

function validarEvaluacion(req, res, next) {
  try {
    const datos = req.body;

    if (
      !datos ||
      typeof datos !== 'object' ||
      Array.isArray(datos)
    ) {
      throw new HttpError(
        400,
        'Debes enviar un objeto JSON con los datos de la evaluación',
        'CUERPO_INVALIDO'
      );
    }

    const contieneCamposNoPermitidos = Object.keys(datos).some(
      (campo) => !CAMPOS_PERMITIDOS.includes(campo)
    );

    if (contieneCamposNoPermitidos) {
      throw new HttpError(
        400,
        'La solicitud contiene campos no permitidos',
        'CAMPOS_NO_PERMITIDOS'
      );
    }

    const {
      sesion,
      calificacion,
      comentario,
    } = datos;

    if (
      typeof sesion !== 'string' ||
      !sesion.trim()
    ) {
      throw new HttpError(
        400,
        'Debes indicar la sesión de tutoría',
        'SESION_INVALIDA'
      );
    }

    const calificacionNumero = Number(calificacion);

    if (
      !Number.isInteger(calificacionNumero) ||
      calificacionNumero < 1 ||
      calificacionNumero > 5
    ) {
      throw new HttpError(
        400,
        'La calificación debe ser un número entero entre 1 y 5',
        'CALIFICACION_INVALIDA'
      );
    }

    if (
      comentario !== undefined &&
      (typeof comentario !== 'string' ||
        comentario.length > 500)
    ) {
      throw new HttpError(
        400,
        'El comentario no puede superar 500 caracteres',
        'COMENTARIO_INVALIDO'
      );
    }

    res.locals.evaluacion = {
      sesion,
      calificacion: calificacionNumero,
      comentario: comentario?.trim() || '',
    };

    next();
  } catch (error) {
    next(error);
  }
}

module.exports = validarEvaluacion;