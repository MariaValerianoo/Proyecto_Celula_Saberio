const HttpError = require('../utils/HttpError');

const MODALIDADES_VALIDAS = [
  'Presencial',
  'Virtual',
];

const CAMPOS_PERMITIDOS = [
  'monitor',
  'materia',
  'tema',
  'descripcion',
  'modalidad',
  'fechaPreferida',
  'horaPreferida',
  'duracionEstimadaHoras',
];

function validarSolicitudTutoria(req, res, next) {
  try {
    const datos = req.body;

    if (
      !datos ||
      typeof datos !== 'object' ||
      Array.isArray(datos)
    ) {
      throw new HttpError(
        400,
        'Debes enviar un objeto JSON con los datos de la solicitud',
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
      monitor,
      materia,
      tema,
      descripcion,
      modalidad,
      fechaPreferida,
      horaPreferida,
      duracionEstimadaHoras,
    } = datos;

    if (
      typeof monitor !== 'string' ||
      !monitor.trim()
    ) {
      throw new HttpError(
        400,
        'Debes indicar el monitor',
        'MONITOR_INVALIDO'
      );
    }

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
      typeof tema !== 'string' ||
      tema.trim().length < 5 ||
      tema.trim().length > 150
    ) {
      throw new HttpError(
        400,
        'El tema debe tener entre 5 y 150 caracteres',
        'TEMA_INVALIDO'
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

    const fecha = new Date(fechaPreferida);

    if (
      !fechaPreferida ||
      Number.isNaN(fecha.getTime())
    ) {
      throw new HttpError(
        400,
        'La fecha preferida no es válida',
        'FECHA_INVALIDA'
      );
    }

    if (
      typeof horaPreferida !== 'string' ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(horaPreferida)
    ) {
      throw new HttpError(
        400,
        'La hora preferida debe tener el formato HH:MM',
        'HORA_INVALIDA'
      );
    }

    const duracion = Number(duracionEstimadaHoras);

    if (
      !Number.isInteger(duracion) ||
      duracion < 1 ||
      duracion > 8
    ) {
      throw new HttpError(
        400,
        'La duración estimada debe ser un número entero entre 1 y 8 horas',
        'DURACION_INVALIDA'
      );
    }

    res.locals.solicitudTutoria = {
      monitor,
      materia,
      tema: tema.trim(),
      descripcion: descripcion.trim(),
      modalidad,
      fechaPreferida: fecha,
      horaPreferida,
      duracionEstimadaHoras: duracion,
    };

    next();
  } catch (error) {
    next(error);
  }
}

module.exports = validarSolicitudTutoria;