const { Router } = require('express');
const Notificacion = require('../../models/notificacion.model');
const Usuario = require('../../models/usuario.model');
const autenticar = require('../middlewares/autenticar');
const HttpError = require('../utils/HttpError');
const router = Router();
router.use(autenticar);
const run = fn => async (req, res, next) => { try { await fn(req, res); } catch (error) { next(error); } };
const preferencias = u => ({ notificacionesInternas: u.notificacionesInternas !== false, notificacionesCorreo: u.notificacionesCorreo !== false });
router.get('/preferencias', run(async (req, res) => {
  const u = await Usuario.findById(req.usuario.id).select('notificacionesInternas notificacionesCorreo').lean();
  if (!u) throw new HttpError(401, 'La sesión ya no es válida.', 'SESION_INVALIDA');
  res.json({ preferencias: preferencias(u) });
}));
router.patch('/preferencias', run(async (req, res) => {
  const b = req.body;
  if (!b || Array.isArray(b) || Object.keys(b).length !== 1 || typeof b.notificacionesInternas !== 'boolean') throw new HttpError(400, 'Envía únicamente notificacionesInternas como booleano.', 'PREFERENCIAS_INVALIDAS');
  const u = await Usuario.findByIdAndUpdate(req.usuario.id, { $set: { notificacionesInternas: b.notificacionesInternas } }, { new: true, runValidators: true }).select('notificacionesInternas notificacionesCorreo').lean();
  if (!u) throw new HttpError(401, 'La sesión ya no es válida.', 'SESION_INVALIDA');
  res.json({ preferencias: preferencias(u) });
}));
router.get('/no-leidas', run(async (req, res) => { res.json({ noLeidas: await Notificacion.countDocuments({ usuario: req.usuario.id, read: false }) }); }));
router.get('/', run(async (req, res) => {
  const { pagina = '1', limite = '100' } = req.query;
  if (typeof pagina !== 'string' || !/^[1-9]\d{0,5}$/.test(pagina) || typeof limite !== 'string' || !/^(?:[1-9]\d?|100)$/.test(limite)) throw new HttpError(400, 'Paginación inválida.', 'FILTROS_INVALIDOS');
  const filtro = { usuario: req.usuario.id };
  const [items, total, noLeidas] = await Promise.all([Notificacion.find(filtro).sort({ fecha: -1, _id: -1 }).skip((Number(pagina) - 1) * Number(limite)).limit(Number(limite)).lean(), Notificacion.countDocuments(filtro), Notificacion.countDocuments({ ...filtro, read: false })]);
  res.json({ notificaciones: items.map(n => ({ id: String(n._id), evento: n.evento, type: n.type, title: n.title, text: n.text, details: n.details, href: n.href, read: n.read, time: new Date(n.fecha).toISOString() })), total, noLeidas, pagina: Number(pagina), limite: Number(limite) });
}));
router.patch('/leer-todas', run(async (req, res) => { await Notificacion.updateMany({ usuario: req.usuario.id, read: false }, { $set: { read: true, fechaLectura: new Date() } }); res.json({ mensaje: 'Notificaciones marcadas como leídas.' }); }));
router.patch('/leer', run(async (req, res) => {
  const ids = req.body?.eventos;
  if (!Array.isArray(ids) || !ids.length || ids.length > 100 || ids.some(id => typeof id !== 'string' || !id.length || id.length > 100)) throw new HttpError(400, 'Envía entre 1 y 100 eventos.', 'EVENTOS_INVALIDOS');
  const unicos = [...new Set(ids)];
  const filtro = { usuario: req.usuario.id, evento: { $in: unicos } };
  if (await Notificacion.countDocuments(filtro) !== unicos.length) throw new HttpError(403, 'Una notificación no está disponible para tu cuenta.', 'ACCESO_DENEGADO');
  await Notificacion.updateMany({ ...filtro, read: false }, { $set: { read: true, fechaLectura: new Date() } });
  res.json({ mensaje: 'Notificaciones marcadas como leídas.' });
}));
router.patch('/:id/leer', run(async (req, res) => {
  if (!/^[a-f0-9]{24}$/i.test(req.params.id)) throw new HttpError(400, 'Identificador inválido.', 'ID_INVALIDO');
  const filtro = { _id: req.params.id, usuario: req.usuario.id };
  if (!(await Notificacion.exists(filtro))) throw new HttpError(404, 'Notificación no disponible.', 'NOTIFICACION_NO_ENCONTRADA');
  await Notificacion.updateOne({ ...filtro, read: false }, { $set: { read: true, fechaLectura: new Date() } });
  res.json({ mensaje: 'Notificación marcada como leída.' });
}));
module.exports = router;
