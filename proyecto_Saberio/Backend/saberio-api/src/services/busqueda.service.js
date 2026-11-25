const Usuario = require('../../models/usuario.model');
const PerfilMonitor = require('../../models/perfilMonitor.model');
const Publicacion = require('../../models/publicacion.model');
const SoporteAcademico = require('../../models/soporteAcademico.model');
const Disponibilidad = require('../../models/disponibilidad.model');
const Evaluacion = require('../../models/evaluacion.model');
const HttpError = require('../utils/HttpError');
const { inicioDeHoy } = require('../utils/eventosDisponibilidad');

async function publicacionesVisibles(filtro) {
  const publicaciones = await Publicacion.find({ ...filtro, activa: true })
    .populate('monitor', 'nombre roles')
    .populate('materia', 'nombre codigo activa')
    .sort({ createdAt: -1 });
  const visibles = [];
  const perfiles = new Map();
  for (const publicacion of publicaciones) {
    const monitor = publicacion.monitor;
    const materia = publicacion.materia;
    if (!monitor || !materia || !monitor.roles?.includes('monitor') || materia.activa === false) continue;
    const clave = monitor._id.toString();
    if (!perfiles.has(clave)) perfiles.set(clave, await PerfilMonitor.findOne({ usuario: monitor._id }));
    const perfil = perfiles.get(clave);
    if (!perfil || perfil.estadoPerfil === 'Rechazado') continue;
    if (!await SoporteAcademico.exists({ monitor: monitor._id, materia: materia._id, estado: 'Aprobado' })) continue;
    visibles.push({ publicacion, perfil });
  }
  return visibles;
}

async function resumenMonitor(idMonitor) {
  const evaluacion = await Evaluacion.aggregate([
    { $match: { monitor: idMonitor } },
    { $group: { _id: '$monitor', promedio: { $avg: '$calificacion' }, total: { $sum: 1 } } },
  ]);
  const disponibilidad = await Disponibilidad.find({ monitor: idMonitor, estado: 'Disponible', fecha: { $gte: inicioDeHoy() } }).sort({ fecha: 1, horaInicio: 1 });
  return {
    calificacion: evaluacion.length ? Number(evaluacion[0].promedio.toFixed(2)) : null,
    totalEvaluaciones: evaluacion.length ? evaluacion[0].total : 0,
    disponibilidad,
  };
}

async function buscarMonitores(filtros = {}) {
  const { materia, modalidad, calificacionMinima, precioMaximo, fecha, hora, orden } = filtros;
  const filtro = {};
  if (materia) filtro.materia = materia;
  if (modalidad && modalidad !== 'Todas') filtro.modalidad = { $in: [modalidad, 'Ambas'] };
  if (precioMaximo !== undefined && precioMaximo !== '') filtro.tarifaPorHora = { $lte: Number(precioMaximo) };
  const visibles = await publicacionesVisibles(filtro);
  const monitores = new Map();
  for (const { publicacion, perfil } of visibles) {
    const clave = publicacion.monitor._id.toString();
    if (!monitores.has(clave)) {
      monitores.set(clave, {
        monitor: { id: clave, nombre: publicacion.monitor.nombre },
        perfil,
        ...await resumenMonitor(publicacion.monitor._id),
        publicaciones: [],
      });
    }
    monitores.get(clave).publicaciones.push(publicacion);
  }
  let resultados = Array.from(monitores.values());
  if (calificacionMinima && Number(calificacionMinima) > 0) resultados = resultados.filter(r => r.calificacion !== null && r.calificacion >= Number(calificacionMinima));
  if (fecha && hora) {
    const fechaBusqueda = new Date(fecha);
    resultados = resultados.filter(r => r.disponibilidad.some(d => new Date(d.fecha).toDateString() === fechaBusqueda.toDateString() && d.horaInicio <= hora && d.horaFin > hora));
  }
  if (orden === 'calificacion') resultados.sort((a, b) => (b.calificacion || 0) - (a.calificacion || 0));
  if (orden === 'precio') resultados.sort((a, b) => Math.min(...a.publicaciones.map(p => p.tarifaPorHora)) - Math.min(...b.publicaciones.map(p => p.tarifaPorHora)));
  if (orden === 'disponibilidad') resultados.sort((a, b) => b.disponibilidad.length - a.disponibilidad.length);
  if (orden === 'experiencia') resultados.sort((a, b) => b.totalEvaluaciones - a.totalEvaluaciones);
  return resultados;
}

async function obtenerPerfilPublico(idMonitor) {
  const monitor = await Usuario.findById(idMonitor);
  if (!monitor || !monitor.roles.includes('monitor')) throw new HttpError(404, 'El monitor no existe', 'MONITOR_NO_ENCONTRADO');
  const visibles = await publicacionesVisibles({ monitor: monitor._id });
  if (!visibles.length) throw new HttpError(404, 'El monitor no tiene publicaciones activas con acreditación aprobada', 'PERFIL_NO_ENCONTRADO');
  return {
    monitor: { id: monitor._id.toString(), nombre: monitor.nombre },
    perfil: visibles[0].perfil,
    publicaciones: visibles.map(v => v.publicacion),
    ...await resumenMonitor(monitor._id),
  };
}

module.exports = { buscarMonitores, obtenerPerfilPublico };
