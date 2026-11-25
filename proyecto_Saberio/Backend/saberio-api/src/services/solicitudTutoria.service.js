const SolicitudTutoria = require('../../models/solicitudTutoria.model');
const Usuario = require('../../models/usuario.model');
const Materia = require('../../models/materia.model');
const Publicacion = require('../../models/publicacion.model');
const Disponibilidad = require('../../models/disponibilidad.model');
const HttpError = require('../utils/HttpError');
const disponibilidadService = require('./disponibilidad.service');
const { esFechaFutura } = require('../utils/eventosDisponibilidad');

const {
  notificarNuevaSolicitud,
} = require('./notificacion.service');

async function crear(idEstudiante, datos) {
  const monitor = await Usuario.findById(datos.monitor);

  if (!monitor || !monitor.roles.includes('monitor')) {
    throw new HttpError(
      400,
      'El monitor indicado no existe',
      'MONITOR_INVALIDO'
    );
  }

  const materia = await Materia.findById(datos.materia);

  if (!materia || !materia.activa) {
    throw new HttpError(
      400,
      'La materia indicada no existe o no está activa',
      'MATERIA_INVALIDA'
    );
  }

  const publicacion = await Publicacion.findOne({
    monitor: datos.monitor,
    materia: datos.materia,
    activa: true,
  });

  if (!publicacion) {
    throw new HttpError(
      400,
      'El monitor no tiene una publicación activa para esta materia',
      'PUBLICACION_NO_DISPONIBLE'
    );
  }

  let disponibilidadId = null;

  if (datos.disponibilidad) {
    const franja = await Disponibilidad.findById(
      datos.disponibilidad
    );

    if (
      !franja ||
      franja.monitor.toString() !==
        datos.monitor ||
      franja.estado !== 'Disponible' ||
      !esFechaFutura(franja.fecha)
    ) {
      throw new HttpError(
        400,
        'El horario seleccionado no está disponible',
        'HORARIO_NO_DISPONIBLE'
      );
    }

    disponibilidadId = franja._id;
  }

  const solicitudDuplicada =
    await SolicitudTutoria.findOne({
      estudiante: idEstudiante,
      monitor: datos.monitor,
      materia: datos.materia,
      estado: 'Pendiente',
    });

  if (solicitudDuplicada) {
    throw new HttpError(
      400,
      'Ya tienes una solicitud pendiente para este monitor y materia',
      'SOLICITUD_DUPLICADA'
    );
  }

  const solicitud = await SolicitudTutoria.create({
    ...datos,
    disponibilidad: disponibilidadId,
    estudiante: idEstudiante,
  });

  await notificarNuevaSolicitud(solicitud);

  return solicitud;
}

async function listar(idUsuario, rol) {
  const filtro =
    rol === 'monitor'
      ? { monitor: idUsuario }
      : { estudiante: idUsuario };

  const solicitudes = await SolicitudTutoria.find(filtro)
    .populate('materia', 'nombre codigo')
    .populate('estudiante', 'nombre correo')
    .populate('monitor', 'nombre correo')
    .populate('disponibilidad')
    .sort({ createdAt: -1 });

  return solicitudes;
}

async function obtenerPorId(idSolicitud, idUsuario, rol) {
  const solicitud = await SolicitudTutoria.findById(idSolicitud)
    .populate('materia', 'nombre codigo')
    .populate('estudiante', 'nombre correo')
    .populate('monitor', 'nombre correo')
    .populate('disponibilidad');

  if (!solicitud) {
    throw new HttpError(
      404,
      'La solicitud no existe',
      'SOLICITUD_NO_ENCONTRADA'
    );
  }

  const puedeVerla =
    rol === 'admin' ||
    solicitud.estudiante._id.toString() === idUsuario ||
    solicitud.monitor._id.toString() === idUsuario;

  if (!puedeVerla) {
    throw new HttpError(
      403,
      'No tienes permisos para ver esta solicitud',
      'ACCESO_DENEGADO'
    );
  }

  return solicitud;
}

async function actualizarEstado(
  idSolicitud,
  idMonitor,
  estado,
  respuestaMonitor
) {
  const solicitud = await SolicitudTutoria.findById(idSolicitud);

  if (!solicitud) {
    throw new HttpError(
      404,
      'La solicitud no existe',
      'SOLICITUD_NO_ENCONTRADA'
    );
  }

  if (solicitud.monitor.toString() !== idMonitor) {
    throw new HttpError(
      403,
      'No puedes responder esta solicitud',
      'ACCESO_DENEGADO'
    );
  }

  if (solicitud.estado !== 'Pendiente') {
    throw new HttpError(
      400,
      'Esta solicitud ya fue respondida',
      'SOLICITUD_YA_RESPONDIDA'
    );
  }

  const estadosPermitidos = [
    'Aceptada',
    'Rechazada',
    'Reprogramada',
  ];

  if (!estadosPermitidos.includes(estado)) {
    throw new HttpError(
      400,
      'El estado indicado no es válido',
      'ESTADO_INVALIDO'
    );
  }

  if (
    estado === 'Aceptada' &&
    solicitud.disponibilidad
  ) {
    await disponibilidadService.reservarSiDisponible(
      solicitud.disponibilidad,
      idMonitor
    );
  }

  solicitud.estado = estado;
  solicitud.respuestaMonitor = respuestaMonitor || '';
  solicitud.fechaRespuesta = new Date();

  await solicitud.save();

  return solicitud;
}

const internas = require('./notificacionInterna.service');

async function crearConNotificacion(...args) {
  const solicitud = await crear(...args);
  await internas.seguro(internas.nuevaSolicitud, solicitud);
  return solicitud;
}

async function actualizarEstadoConNotificacion(...args) {
  const solicitud = await actualizarEstado(...args);
  await internas.seguro(
    internas.respuestaSolicitud,
    solicitud
  );
  return solicitud;
}

module.exports = {
  crear: crearConNotificacion,
  listar,
  obtenerPorId,
  actualizarEstado: actualizarEstadoConNotificacion,
};
