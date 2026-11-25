const Usuario = require('../../models/usuario.model');
const Notificacion = require('../../models/notificacion.model');
const { Schema, model, models } = require('mongoose');
const eventos = require('../utils/eventosNotificacion');
const Lectura = models.LecturaNotificacion || model('LecturaNotificacion', new Schema({ _id: String, usuario: { type: Schema.Types.ObjectId, ref: 'Usuario' }, evento: String, fecha: Date }, { collection: 'lecturas_notificaciones', versionKey: false }));
async function crear(aviso) {
  if (!aviso) return;
  const usuario = await Usuario.findById(aviso.usuario).select('notificacionesInternas correoVerificado estadoCuenta').lean();
  if (!usuario || usuario.notificacionesInternas === false || !usuario.correoVerificado || usuario.estadoCuenta !== 'habilitada') return;
  await Notificacion.init();
  const lectura = await Lectura.findById(`${aviso.usuario}:${aviso.evento}`).lean();
  const fecha = aviso.fecha ? new Date(aviso.fecha) : null;
  if (!fecha || Number.isNaN(fecha.getTime())) throw new Error('EVENTO_SIN_FECHA');
  const datos = { ...aviso, fecha, read: Boolean(lectura), fechaLectura: lectura?.fecha || null };
  try { await Notificacion.updateOne({ usuario: aviso.usuario, evento: aviso.evento }, { $setOnInsert: datos }, { upsert: true, runValidators: true }); }
  catch (error) { if (error.code !== 11000) throw error; }
}
async function nuevaSolicitud(s) { await crear(eventos.solicitud(s)); }
async function respuestaSolicitud(s) { await crear(eventos.solicitud(s, true)); }
async function nuevoSoporte(s) {
  const admins = await Usuario.find({ roles: 'admin', correoVerificado: true, estadoCuenta: 'habilitada', notificacionesInternas: { $ne: false } }).select('_id').lean();
  for (const admin of admins) await crear(eventos.soporte(s, admin._id));
}
async function revisionSoporte(s) { await crear(eventos.soporte(s, s.monitor, true)); }
async function seguro(fn, dato) {
  try { await fn(dato); } catch { console.error('NOTIFICACION_INTERNA_NO_PERSISTIDA'); }
}
module.exports = { crear, nuevaSolicitud, respuestaSolicitud, nuevoSoporte, revisionSoporte, seguro };
