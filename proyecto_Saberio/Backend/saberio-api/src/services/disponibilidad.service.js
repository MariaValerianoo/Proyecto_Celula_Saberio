const Disponibilidad = require('../../models/disponibilidad.model');
const HttpError = require('../utils/HttpError');
const {
  horaAMinutos,
  inicioDeHoy,
  esFechaFutura,
} = require('../utils/eventosDisponibilidad');

async function crear(idMonitor, datos) {
  const inicio = horaAMinutos(datos.horaInicio);
  const fin = horaAMinutos(datos.horaFin);

  if (inicio === null || fin === null) {
    throw new HttpError(
      400,
      'El horario indicado no es válido',
      'HORARIO_INVALIDO'
    );
  }

  if (fin <= inicio) {
    throw new HttpError(
      400,
      'La hora de finalización debe ser posterior a la hora de inicio',
      'HORARIO_INVALIDO'
    );
  }

  if (!esFechaFutura(datos.fecha)) {
    throw new HttpError(
      400,
      'Solo puedes crear disponibilidad para hoy o una fecha futura',
      'FECHA_NO_VALIDA'
    );
  }

  const disponibilidades = await Disponibilidad.find({
    monitor: idMonitor,
    fecha: datos.fecha,
  });

  const existeSuperposicion = disponibilidades.some(
    (disponibilidad) => {
      const inicioExistente = horaAMinutos(
        disponibilidad.horaInicio
      );
      const finExistente = horaAMinutos(
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
    fecha: {
      $gte: inicioDeHoy(),
    },
  }).sort({
    fecha: 1,
    horaInicio: 1,
  });

  return disponibilidades;
}

async function reservarSiDisponible(
  idDisponibilidad,
  idMonitor
) {
  const disponibilidad =
    await Disponibilidad.findOneAndUpdate(
      {
        _id: idDisponibilidad,
        monitor: idMonitor,
        estado: 'Disponible',
      },
      {
        $set: {
          estado: 'Reservado',
        },
      },
      {
        new: true,
      }
    );

  if (!disponibilidad) {
    throw new HttpError(
      409,
      'El horario seleccionado ya no está disponible',
      'HORARIO_NO_DISPONIBLE'
    );
  }

  return disponibilidad;
}

async function liberarSiReservada(
  idDisponibilidad,
  idMonitor
) {
  if (!idDisponibilidad) {
    return null;
  }

  return Disponibilidad.findOneAndUpdate(
    {
      _id: idDisponibilidad,
      monitor: idMonitor,
      estado: 'Reservado',
    },
    {
      $set: {
        estado: 'Disponible',
      },
    },
    {
      new: true,
    }
  );
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
  reservarSiDisponible,
  liberarSiReservada,
  actualizarEstado,
  eliminar,
};
