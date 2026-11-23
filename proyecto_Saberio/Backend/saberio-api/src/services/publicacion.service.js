const Publicacion = require('../../models/publicacion.model');
const Materia = require('../../models/materia.model');
const PerfilMonitor = require('../../models/perfilMonitor.model');
const SoporteAcademico = require('../../models/soporteAcademico.model');
const HttpError = require('../utils/HttpError');
async function validarMateriaParaPublicar(idMonitor, idMateria) {
  const perfil = await PerfilMonitor.findOne({ usuario: idMonitor });
  if (!perfil) throw new HttpError(400, 'Debes crear tu perfil de monitor antes de publicar', 'PERFIL_NO_ENCONTRADO');
  const materia = await Materia.findById(idMateria);
  if (!materia || !materia.activa) throw new HttpError(400, 'La materia indicada no existe o no está activa', 'MATERIA_INVALIDA');
  if (!(perfil.materiasOfrecidas || []).some(m => m.toString() === materia._id.toString())) throw new HttpError(400, 'Solo puedes publicar materias incluidas en tu perfil', 'MATERIA_NO_EN_PERFIL');
  const aprobado = await SoporteAcademico.exists({ monitor: idMonitor, materia: materia._id, estado: 'Aprobado' });
  if (!aprobado) {
    const pendiente = await SoporteAcademico.exists({ monitor: idMonitor, materia: materia._id, estado: 'Pendiente' });
    throw new HttpError(403, pendiente ? 'Tu soporte está pendiente de aprobación por el administrador. Todavía no puedes publicar esta materia.' : 'Carga un soporte académico de esta materia y espera la aprobación del administrador antes de publicar.', 'MONITOR_NO_ACREDITADO');
  }
  return materia;
}
async function crear(idMonitor, datos) {
  const materia = await validarMateriaParaPublicar(idMonitor, datos.materia);
  return Publicacion.create({ monitor: idMonitor, materia: materia._id, descripcion: datos.descripcion, modalidad: datos.modalidad, tarifaPorHora: datos.tarifaPorHora, duracionMinutos: datos.duracionMinutos });
}
async function listarActivas() {
  const publicaciones = await Publicacion.find({ activa: true }).populate('monitor', 'nombre').populate('materia', 'nombre codigo').sort({ createdAt: -1 });
  return publicaciones;
}
async function listarPropias(idMonitor) {
  return Publicacion.find({ monitor: idMonitor }).populate('materia', 'nombre codigo').sort({ createdAt: -1 });
}
async function obtenerPorId(idPublicacion) {
  const publicacion = await Publicacion.findById(idPublicacion).populate('monitor', 'nombre').populate('materia', 'nombre codigo');
  if (!publicacion) throw new HttpError(404, 'La publicación no existe', 'PUBLICACION_NO_ENCONTRADA');
  return publicacion;
}
async function propia(idPublicacion, idMonitor) {
  const publicacion = await Publicacion.findById(idPublicacion);
  if (!publicacion) throw new HttpError(404, 'La publicación no existe', 'PUBLICACION_NO_ENCONTRADA');
  if (publicacion.monitor.toString() !== String(idMonitor)) throw new HttpError(403, 'No puedes modificar esta publicación', 'ACCESO_DENEGADO');
  return publicacion;
}
async function actualizar(idPublicacion, idMonitor, datos) {
  const publicacion = await propia(idPublicacion, idMonitor);
  const materia = await validarMateriaParaPublicar(idMonitor, datos.materia);
  publicacion.materia = materia._id;
  publicacion.descripcion = datos.descripcion;
  publicacion.modalidad = datos.modalidad;
  publicacion.tarifaPorHora = datos.tarifaPorHora;
  publicacion.duracionMinutos = datos.duracionMinutos;
  await publicacion.save();
  return publicacion;
}
async function cambiarEstado(idPublicacion, idMonitor, activa) {
  const publicacion = await propia(idPublicacion, idMonitor);
  if (typeof activa !== 'boolean') throw new HttpError(400, 'El estado activa debe ser true o false', 'ESTADO_INVALIDO');
  if (activa) await validarMateriaParaPublicar(idMonitor, publicacion.materia);
  publicacion.activa = activa;
  await publicacion.save();
  return publicacion;
}
async function eliminar(idPublicacion, idMonitor) {
  const publicacion = await propia(idPublicacion, idMonitor);
  await Publicacion.findByIdAndDelete(idPublicacion);
  return publicacion;
}
module.exports = { crear, listarActivas, listarPropias, obtenerPorId, actualizar, cambiarEstado, eliminar };
