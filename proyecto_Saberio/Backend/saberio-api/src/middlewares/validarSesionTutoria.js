const HttpError = require('../utils/HttpError');

const MODALIDADES_VALIDAS = [
  'Presencial',
  'Virtual',
];

const CAMPOS_PERMITIDOS = [
  'solicitud',
  'fecha',
  'hora',
  'duracionHoras',
  'lugarOEnlace',
  'notas',
];

function validarSesionTutoria(req, res, next) {
  try {
    const datos = req.body;

    if (
      !datos ||
      typeof datos !== 'object' ||
      Array.isArray(datos)
    ) {
      throw new HttpError(
        400,
        'Debes enviar un objeto JSON con los datos de la sesión',
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
      solicitud,
      fecha,
      hora,
      duracionHoras,
      lugarOEnlace,
      notas,
    } = datos;

    if (
      typeof solicitud !== 'string' ||
      !solicitud.trim()
    ) {
      throw new HttpError(
        400,
        'Debes indicar la solicitud de tutoría',
        'SOLICITUD_INVALIDA'
      );
    }

    const fechaValida = new Date(fecha);

    if (
      !fecha ||
      Number.isNaN(fechaValida.getTime())
    ) {
      throw new HttpError(
        400,
        'La fecha no es válida',
        'FECHA_INVALIDA'
      );
    }

    if (
      typeof hora !== 'string' ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(hora)
    ) {
      throw new HttpError(
        400,
        'La hora debe tener el formato HH:MM',
        'HORA_INVALIDA'
      );
    }

    const duracion = Number(duracionHoras);

    if (
      !Number.isInteger(duracion) ||
      duracion < 1 ||
      duracion > 8
    ) {
      throw new HttpError(
        400,
        'La duración debe ser un número entero entre 1 y 8 horas',
        'DURACION_INVALIDA'
      );
    }

    if (
      lugarOEnlace !== undefined &&
      (typeof lugarOEnlace !== 'string' ||
        lugarOEnlace.length > 300)
    ) {
      throw new HttpError(
        400,
        'El lugar o enlace no puede superar 300 caracteres',
        'LUGAR_INVALIDO'
      );
    }

    if (
      notas !== undefined &&
      (typeof notas !== 'string' ||
        notas.length > 2000)
    ) {
      throw new HttpError(
        400,
        'Las notas no pueden superar 2000 caracteres',
        'NOTAS_INVALIDAS'
      );
    }

    res.locals.sesionTutoria = {
      solicitud,
      fecha: fechaValida,
      hora,
      duracionHoras: duracion,
      lugarOEnlace: lugarOEnlace?.trim() || '',
      notas: notas?.trim() || '',
    };

    next();
  } catch (error) {
    next(error);
  }
}

module.exports = validarSesionTutoria;