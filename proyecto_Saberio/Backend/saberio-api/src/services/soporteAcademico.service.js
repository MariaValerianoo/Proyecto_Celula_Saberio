const mongoose = require('mongoose');
const SoporteAcademico = require('../../models/soporteAcademico.model');
const ArchivoSoporte = require('../../models/archivoSoporte.model');
const Materia = require('../../models/materia.model');
const PerfilMonitor = require('../../models/perfilMonitor.model');
const HttpError = require('../utils/HttpError');
const path = require('path');
const fs = require('fs');
function validarId(valor) {
  if (typeof valor !== 'string' || !/^[a-f\d]{24}$/i.test(valor)) throw new HttpError(400, 'Identificador no válido', 'ID_INVALIDO');
}
async function buscar(id) {
  validarId(id);
  const soporte = await SoporteAcademico.findById(id);
  if (!soporte) throw new HttpError(404, 'El soporte no existe', 'SOPORTE_NO_ENCONTRADO');
  return soporte;
}
function verificarAccesoSoporte(soporte, usuario) {
  if (soporte.monitor.toString() !== usuario.id && !usuario.roles.includes('admin')) throw new HttpError(403, 'No tienes permisos para acceder a este soporte', 'ACCESO_DENEGADO');
}
function publico(soporte) {
  const datos = soporte.toJSON();
  delete datos.rutaArchivo; delete datos.nombreArchivo;
  return datos;
}
function rutaLocal(soporte) {
  const carpeta = path.resolve(process.cwd(), 'uploads', 'soportes');
  const ruta = path.resolve(soporte.rutaArchivo);
  const relativa = path.relative(carpeta, ruta);
  if (!relativa || relativa === '..' || relativa.startsWith(`..${path.sep}`) || path.isAbsolute(relativa)) throw new HttpError(404, 'El archivo no está disponible', 'ARCHIVO_NO_ENCONTRADO');
  return ruta;
}
function esMongo(soporte) { return soporte.rutaArchivo.startsWith('mongodb:'); }
async function crear(idMonitor, datos, archivo) {
  validarId(datos.materia);
  const materia = await Materia.findById(datos.materia);
  if (!materia || !materia.activa) throw new HttpError(400, 'La materia indicada no existe o no está activa', 'MATERIA_INVALIDA');
  const perfil = await PerfilMonitor.findOne({ usuario: idMonitor });
  if (!perfil) throw new HttpError(400, 'Debes crear tu perfil de monitor antes de cargar soportes', 'PERFIL_NO_ENCONTRADO');
  if (!perfil.materiasOfrecidas.some(m => m.toString() === materia._id.toString())) throw new HttpError(400, 'Solo puedes cargar soportes de materias incluidas en tu perfil', 'MATERIA_NO_EN_PERFIL');
  const extensiones = { 'application/pdf': '.pdf', 'image/png': '.png', 'image/jpeg': '.jpg' };
  if (!archivo || !Buffer.isBuffer(archivo.buffer) || !archivo.buffer.length || archivo.buffer.length > 5 * 1024 * 1024 || !extensiones[archivo.mimetype]) throw new HttpError(400, 'Envía un PDF, PNG o JPG no vacío de máximo 5 MB', 'ARCHIVO_INVALIDO');
  const archivoId = new mongoose.Types.ObjectId();
  const soporte = new SoporteAcademico({ monitor: idMonitor, materia: materia._id, tipoDocumento: datos.tipoDocumento, nombreOriginal: archivo.originalname, nombreArchivo: `${archivoId}${extensiones[archivo.mimetype]}`, rutaArchivo: `mongodb:${archivoId}`, tipoMime: archivo.mimetype, tamanoBytes: archivo.buffer.length });
  await soporte.validate();
  await ArchivoSoporte.create({ _id: archivoId, contenido: archivo.buffer });
  try { await soporte.save(); }
  catch (error) {
    try { await ArchivoSoporte.deleteOne({ _id: archivoId }); } catch { console.error('No se pudo limpiar un archivo de soporte huérfano'); }
    throw error;
  }
  return publico(soporte);
}
async function listar() {
  const soportes = await SoporteAcademico.find().populate('monitor', 'nombre').populate('materia', 'nombre codigo').sort({ createdAt: -1 });
  return soportes.map(publico);
}
async function listarPropios(idMonitor) {
  const soportes = await SoporteAcademico.find({ monitor: idMonitor }).populate('materia', 'nombre codigo').sort({ createdAt: -1 });
  return soportes.map(publico);
}
async function obtenerPorId(id, usuario) {
  const soporte = await buscar(id);
  verificarAccesoSoporte(soporte, usuario);
  await soporte.populate([{ path: 'monitor', select: 'nombre' }, { path: 'materia', select: 'nombre codigo' }]);
  return publico(soporte);
}
async function descargar(id, usuario) {
  const soporte = await buscar(id);
  verificarAccesoSoporte(soporte, usuario);
  if (esMongo(soporte)) {
    const archivoId = soporte.rutaArchivo.slice('mongodb:'.length);
    validarId(archivoId);
    const archivo = await ArchivoSoporte.findById(archivoId).select('+contenido');
    if (!archivo?.contenido?.length) throw new HttpError(404, 'El archivo no está disponible', 'ARCHIVO_NO_ENCONTRADO');
    return { soporte, contenido: Buffer.from(archivo.contenido) };
  }
  const rutaAbsoluta = rutaLocal(soporte);
  try {
    const stat = await fs.promises.stat(rutaAbsoluta);
    if (!stat.isFile()) throw new HttpError(404, 'El archivo no está disponible', 'ARCHIVO_NO_ENCONTRADO');
  } catch (error) {
    if (['ENOENT', 'ENOTDIR'].includes(error.code)) throw new HttpError(404, 'El archivo local anterior no está disponible. Debe volver a cargarse.', 'ARCHIVO_NO_ENCONTRADO');
    throw error;
  }
  return { soporte, rutaAbsoluta };
}
async function revisar(id, datos) {
  const soporte = await buscar(id);
  if (soporte.estado !== 'Pendiente') throw new HttpError(400, 'Este soporte ya fue revisado', 'SOPORTE_YA_REVISADO');
  if (!['Aprobado', 'Rechazado'].includes(datos.estado)) throw new HttpError(400, 'Selecciona Aprobado o Rechazado', 'ESTADO_INVALIDO');
  if (datos.observacionesAdmin !== undefined && typeof datos.observacionesAdmin !== 'string') throw new HttpError(400, 'Las observaciones deben ser texto', 'OBSERVACIONES_INVALIDAS');
  const observaciones = (datos.observacionesAdmin || '').trim();
  if (datos.estado === 'Rechazado' && !observaciones) throw new HttpError(400, 'Debes indicar observaciones al rechazar el soporte', 'OBSERVACIONES_REQUERIDAS');
  soporte.estado = datos.estado; soporte.observacionesAdmin = observaciones; soporte.fechaRevision = new Date();
  await soporte.save();
  if (datos.estado === 'Aprobado') await PerfilMonitor.updateOne({ usuario: soporte.monitor }, { $addToSet: { materiasAcreditadas: soporte.materia } });
  else if (!(await SoporteAcademico.exists({ monitor: soporte.monitor, materia: soporte.materia, estado: 'Aprobado' }))) await PerfilMonitor.updateOne({ usuario: soporte.monitor }, { $pull: { materiasAcreditadas: soporte.materia } });
  return publico(soporte);
}
async function eliminar(id, idMonitor) {
  const soporte = await buscar(id);
  if (soporte.monitor.toString() !== idMonitor) throw new HttpError(403, 'No puedes eliminar este soporte', 'ACCESO_DENEGADO');
  if (soporte.estado !== 'Pendiente') throw new HttpError(400, 'Solo puedes eliminar soportes pendientes', 'SOPORTE_NO_ELIMINABLE');
  if (esMongo(soporte)) {
    const archivoId = soporte.rutaArchivo.slice('mongodb:'.length);
    validarId(archivoId);
    await ArchivoSoporte.deleteOne({ _id: archivoId });
  } else {
    try { await fs.promises.unlink(rutaLocal(soporte)); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  await SoporteAcademico.findByIdAndDelete(id);
  return publico(soporte);
}
const internas = require('./notificacionInterna.service');
async function crearConNotificacion(...args) {
  const soporte = await crear(...args);
  await internas.seguro(internas.nuevoSoporte, soporte);
  return soporte;
}
async function revisarConNotificacion(...args) {
  const soporte = await revisar(...args);
  await internas.seguro(internas.revisionSoporte, soporte);
  return soporte;
}
module.exports = { crear: crearConNotificacion, listar, listarPropios, obtenerPorId, descargar, revisar: revisarConNotificacion, eliminar };
