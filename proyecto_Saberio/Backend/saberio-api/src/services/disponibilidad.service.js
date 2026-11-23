const Disponibilidad = require('../../models/disponibilidad.model');
const HttpError = require('../utils/HttpError');

function convertirHoraAMinutos(hora) {
  const [horas, minutos] = hora
    .split(':')
    .map(Number);

  return horas * 60 + minutos;
}

async function crear(idMonitor, datos) {
  const inicio = convertirHoraAMinutos(
    datos.horaInicio
  );

  const fin = convertirHoraAMinutos(
    datos.horaFin
  );

  const disponibilidades = await Disponibilidad.find({
    monitor: idMonitor,
    fecha: datos.fecha,
  });

  const existeSuperposicion = disponibilidades.some(
    (disponibilidad) => {
      const inicioExistente =
        convertirHoraAMinutos(
          disponibilidad.horaInicio
        );

      const finExistente =
        convertirHoraAMinutos(
          disponibilidad.horaFin
        );

      return (
        inicio < finExistente &&
        fin > inicioExistente
      );
    }
  );

  if (existeSuperposicion) {
    throw new HttpError(
      400,
      'Ya tienes un bloque de disponibilidad que se cruza con este horario',
      'HORARIO_SUPERPUESTO'
    );
  }

  const disponibilidad = await Disponibilidad.create({
    monitor: idMonitor,
    fecha: datos.fecha,
    horaInicio: datos.horaInicio,
    horaFin: datos.horaFin,
  });

  return disponibilidad;
}

async function listarPropias(idMonitor) {
  const disponibilidades = await Disponibilidad.find({
    monitor: idMonitor,
  }).sort({
    fecha: 1,
    horaInicio: 1,
  });

  return disponibilidades;
}

async function listarDisponibles(idMonitor) {
  const disponibilidades = await Disponibilidad.find({
    monitor: idMonitor,
    estado: 'Disponible',
  }).sort({
    fecha: 1,
    horaInicio: 1,
  });

  return disponibilidades;
}

async function actualizarEstado(
  idDisponibilidad,
  idMonitor,
  estado
) {
  const disponibilidad =
    await Disponibilidad.findById(idDisponibilidad);

  if (!disponibilidad) {
    throw new HttpError(
      404,
      'El bloque de disponibilidad no existe',
      'DISPONIBILIDAD_NO_ENCONTRADA'
    );
  }

  if (
    disponibilidad.monitor.toString() !==
    idMonitor
  ) {
    throw new HttpError(
      403,
      'No puedes modificar esta disponibilidad',
      'ACCESO_DENEGADO'
    );
  }

  if (disponibilidad.estado === 'Reservado') {
    throw new HttpError(
      400,
      'No puedes modificar un horario reservado',
      'HORARIO_RESERVADO'
    );
  }

  const estadosPermitidos = [
    'Disponible',
    'Bloqueado',
  ];

  if (!estadosPermitidos.includes(estado)) {
    throw new HttpError(
      400,
      'El estado indicado no es válido',
      'ESTADO_INVALIDO'
    );
  }

  disponibilidad.estado = estado;

  await disponibilidad.save();

  return disponibilidad;
}

async function eliminar(
  idDisponibilidad,
  idMonitor
) {
  const disponibilidad =
    await Disponibilidad.findById(idDisponibilidad);

  if (!disponibilidad) {
    throw new HttpError(
      404,
      'El bloque de disponibilidad no existe',
      'DISPONIBILIDAD_NO_ENCONTRADA'
    );
  }

  if (
    disponibilidad.monitor.toString() !==
    idMonitor
  ) {
    throw new HttpError(
      403,
      'No puedes eliminar esta disponibilidad',
      'ACCESO_DENEGADO'
    );
  }

  if (disponibilidad.estado === 'Reservado') {
    throw new HttpError(
      400,
      'No puedes eliminar un horario reservado',
      'HORARIO_RESERVADO'
    );
  }

  await Disponibilidad.findByIdAndDelete(
    idDisponibilidad
  );

  return disponibilidad;
}

module.exports = {
  crear,
  listarPropias,
  listarDisponibles,
  actualizarEstado,
  eliminar,
};