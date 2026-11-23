const HttpError = require('../utils/HttpError');

const CAMPOS_PERMITIDOS = [
  'fecha',
  'horaInicio',
  'horaFin',
];

function validarDisponibilidad(req, res, next) {
  try {
    const datos = req.body;

    if (
      !datos ||
      typeof datos !== 'object' ||
      Array.isArray(datos)
    ) {
      throw new HttpError(
        400,
        'Debes enviar un objeto JSON con los datos de disponibilidad',
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
      fecha,
      horaInicio,
      horaFin,
    } = datos;

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

    const formatoHora = /^([01]\d|2[0-3]):[0-5]\d$/;

    if (
      typeof horaInicio !== 'string' ||
      !formatoHora.test(horaInicio)
    ) {
      throw new HttpError(
        400,
        'La hora de inicio debe tener el formato HH:MM',
        'HORA_INICIO_INVALIDA'
      );
    }

    if (
      typeof horaFin !== 'string' ||
      !formatoHora.test(horaFin)
    ) {
      throw new HttpError(
        400,
        'La hora de fin debe tener el formato HH:MM',
        'HORA_FIN_INVALIDA'
      );
    }

    const [horaInicioNumero, minutoInicioNumero] =
      horaInicio.split(':').map(Number);

    const [horaFinNumero, minutoFinNumero] =
      horaFin.split(':').map(Number);

    const minutosInicio =
      horaInicioNumero * 60 + minutoInicioNumero;

    const minutosFin =
      horaFinNumero * 60 + minutoFinNumero;

    if (minutosFin <= minutosInicio) {
      throw new HttpError(
        400,
        'La hora de fin debe ser mayor que la hora de inicio',
        'HORARIO_INVALIDO'
      );
    }

    res.locals.disponibilidad = {
      fecha: fechaValida,
      horaInicio,
      horaFin,
    };

    next();
  } catch (error) {
    next(error);
  }
}

module.exports = validarDisponibilidad;