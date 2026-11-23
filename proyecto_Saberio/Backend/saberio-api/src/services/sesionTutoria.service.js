const SesionTutoria = require('../../models/sesionTutoria.model');
const SolicitudTutoria = require('../../models/solicitudTutoria.model');
const HttpError = require('../utils/HttpError');

async function crear(idMonitor, datos) {
  const solicitud = await SolicitudTutoria.findById(
    datos.solicitud
  );

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
      'Solo el monitor de la solicitud puede crear la sesión',
      'ACCESO_DENEGADO'
    );
  }

  if (solicitud.estado !== 'Aceptada') {
    throw new HttpError(
      400,
      'Solo puedes crear una sesión para una solicitud aceptada',
      'SOLICITUD_NO_ACEPTADA'
    );
  }

  const sesionExistente = await SesionTutoria.findOne({
    solicitud: solicitud._id,
  });

  if (sesionExistente) {
    throw new HttpError(
      400,
      'Ya existe una sesión para esta solicitud',
      'SESION_EXISTENTE'
    );
  }

  const sesion = await SesionTutoria.create({
    solicitud: solicitud._id,
    estudiante: solicitud.estudiante,
    monitor: solicitud.monitor,
    materia: solicitud.materia,
    tema: solicitud.tema,
    modalidad: solicitud.modalidad,
    fecha: datos.fecha,
    hora: datos.hora,
    duracionHoras: datos.duracionHoras,
    lugarOEnlace: datos.lugarOEnlace,
    notas: datos.notas,
  });

  return sesion;
}

async function listar(idUsuario, rol) {
  const filtro =
    rol === 'monitor'
      ? { monitor: idUsuario }
      : { estudiante: idUsuario };

  const sesiones = await SesionTutoria.find(filtro)
    .populate('materia', 'nombre codigo')
    .populate('estudiante', 'nombre correo')
    .populate('monitor', 'nombre correo')
    .sort({ fecha: 1 });

  return sesiones;
}

async function obtenerPorId(idSesion, idUsuario, rol) {
  const sesion = await SesionTutoria.findById(idSesion)
    .populate('materia', 'nombre codigo')
    .populate('estudiante', 'nombre correo')
    .populate('monitor', 'nombre correo');

  if (!sesion) {
    throw new HttpError(
      404,
      'La sesión no existe',
      'SESION_NO_ENCONTRADA'
    );
  }

  const puedeVerla =
    rol === 'admin' ||
    sesion.estudiante._id.toString() === idUsuario ||
    sesion.monitor._id.toString() === idUsuario;

  if (!puedeVerla) {
    throw new HttpError(
      403,
      'No tienes permisos para ver esta sesión',
      'ACCESO_DENEGADO'
    );
  }

  return sesion;
}

async function finalizar(idSesion, idMonitor, notas) {
  const sesion = await SesionTutoria.findById(idSesion);

  if (!sesion) {
    throw new HttpError(
      404,
      'La sesión no existe',
      'SESION_NO_ENCONTRADA'
    );
  }

  if (sesion.monitor.toString() !== idMonitor) {
    throw new HttpError(
      403,
      'Solo el monitor puede finalizar esta sesión',
      'ACCESO_DENEGADO'
    );
  }

  if (sesion.estado !== 'Programada') {
    throw new HttpError(
      400,
      'Esta sesión ya fue finalizada o cancelada',
      'SESION_NO_PROGRAMADA'
    );
  }

  sesion.estado = 'Completada';
  sesion.notas = notas || sesion.notas;
  sesion.fechaFinalizacion = new Date();

  await sesion.save();

  return sesion;
}

module.exports = {
  crear,
  listar,
  obtenerPorId,
  finalizar,
};