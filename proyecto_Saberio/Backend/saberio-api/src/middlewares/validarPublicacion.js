const HttpError = require('../utils/HttpError');

const MODALIDADES_VALIDAS = [
  'Presencial',
  'Virtual',
  'Ambas',
];

const DURACIONES_VALIDAS = [
  60,
  90,
  120,
];

const CAMPOS_PERMITIDOS = [
  'materia',
  'descripcion',
  'modalidad',
  'tarifaPorHora',
  'duracionMinutos',
];

function validarPublicacion(req, res, next) {
  try {
    const datos = req.body;

    if (
      !datos ||
      typeof datos !== 'object' ||
      Array.isArray(datos)
    ) {
      throw new HttpError(
        400,
        'Debes enviar un objeto JSON con los datos de la publicación',
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
      materia,
      descripcion,
      modalidad,
      tarifaPorHora,
      duracionMinutos,
    } = datos;

    if (
      typeof materia !== 'string' ||
      !materia.trim()
    ) {
      throw new HttpError(
        400,
        'Debes indicar la materia',
        'MATERIA_INVALIDA'
      );
    }

    if (
      typeof descripcion !== 'string' ||
      descripcion.trim().length < 10 ||
      descripcion.trim().length > 1000
    ) {
      throw new HttpError(
        400,
        'La descripción debe tener entre 10 y 1000 caracteres',
        'DESCRIPCION_INVALIDA'
      );
    }

    if (!MODALIDADES_VALIDAS.includes(modalidad)) {
      throw new HttpError(
        400,
        'La modalidad no es válida',
        'MODALIDAD_INVALIDA'
      );
    }

    const tarifa = Number(tarifaPorHora);

    if (
      !Number.isFinite(tarifa) ||
      tarifa < 0 ||
      tarifa > 1000000
    ) {
      throw new HttpError(
        400,
        'La tarifa por hora no es válida',
        'TARIFA_INVALIDA'
      );
    }

    const duracion = Number(duracionMinutos);

    if (!DURACIONES_VALIDAS.includes(duracion)) {
      throw new HttpError(
        400,
        'La duración debe ser 60, 90 o 120 minutos',
        'DURACION_INVALIDA'
      );
    }

    res.locals.publicacion = {
      materia,
      descripcion: descripcion.trim(),
      modalidad,
      tarifaPorHora: tarifa,
      duracionMinutos: duracion,
    };

    next();
  } catch (error) {
    next(error);
  }
}

module.exports = validarPublicacion;