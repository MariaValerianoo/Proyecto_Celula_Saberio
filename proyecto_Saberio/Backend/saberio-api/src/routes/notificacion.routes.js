const { Router } = require('express');
const { Schema, model, models } = require('mongoose');
const Soporte = require('../../models/soporteAcademico.model');
const autenticar = require('../middlewares/autenticar');
const Lectura = models.LecturaNotificacion || model('LecturaNotificacion', new Schema({
  _id: String,
  usuario: { type: Schema.Types.ObjectId, ref: 'Usuario', required: true, index: true },
  evento: { type: String, required: true },
  fecha: { type: Date, default: Date.now },
}, { collection: 'lecturas_notificaciones', versionKey: false }));
const router = Router();
router.use(autenticar);
async function eventos(usuario) {
  const avisos = [];
  if (usuario.roles.includes('admin')) {
    const soportes = await Soporte.find().select('monitor materia tipoDocumento estado createdAt').populate('monitor', 'nombre').populate('materia', 'nombre').sort({ createdAt: -1, _id: -1 }).limit(50).lean();
    for (const s of soportes) avisos.push({ evento: `carga_${s._id}`, type: 'request', title: 'Nuevo soporte académico', text: `${s.monitor?.nombre || 'Monitor'} cargó un soporte de ${s.materia?.nombre || 'una materia'}.`, details: `Monitor: ${s.monitor?.nombre || 'No disponible'}\nMateria: ${s.materia?.nombre || 'No disponible'}\nDocumento: ${s.tipoDocumento}\nEstado actual: ${s.estado}`, href: '/admin/soportes', fecha: s.createdAt });
  }
  if (usuario.roles.includes('monitor')) {
    const soportes = await Soporte.find({ monitor: usuario.id, estado: { $in: ['Aprobado', 'Rechazado'] } }).select('materia estado observacionesAdmin fechaRevision updatedAt').populate('materia', 'nombre').sort({ fechaRevision: -1, _id: -1 }).limit(50).lean();
    for (const s of soportes) avisos.push({ evento: `revision_${s._id}_${s.estado}`, type: s.estado === 'Aprobado' ? 'success' : 'warning', title: s.estado === 'Aprobado' ? 'Soporte aprobado' : 'Soporte rechazado', text: `${s.materia?.nombre || 'Tu materia'}: ${s.estado === 'Aprobado' ? 'ya puedes publicar esta materia.' : 'revisa las observaciones y carga un documento corregido.'}`, details: `Materia: ${s.materia?.nombre || 'No disponible'}\nResultado: ${s.estado}\nObservaciones: ${s.observacionesAdmin || 'Sin observaciones'}`, href: s.estado === 'Aprobado' ? '/monitor/publicaciones?nueva=1' : '/monitor/perfil', fecha: s.fechaRevision || s.updatedAt });
  }
  return avisos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).slice(0, 100);
}
router.get('/', async (req, res, next) => {
  try {
    const avisos = await eventos(req.usuario);
    const lecturas = await Lectura.find({ usuario: req.usuario.id, evento: { $in: avisos.map(a => a.evento) } }).select('evento').lean();
    const leidos = new Set(lecturas.map(l => l.evento));
    res.set('Cache-Control', 'private, no-store');
    res.json({ notificaciones: avisos.map((a, i) => ({ ...a, id: i + 1, read: leidos.has(a.evento), time: a.fecha ? new Date(a.fecha).toISOString() : '' })) });
  } catch (error) { next(error); }
});
router.patch('/leer', async (req, res, next) => {
  try {
    const ids = req.body?.eventos;
    if (!Array.isArray(ids) || !ids.length || ids.length > 100 || ids.some(id => typeof id !== 'string' || id.length > 100)) return res.status(400).json({ error: { mensaje: 'Envía entre 1 y 100 identificadores de notificación.' } });
    const disponibles = new Set((await eventos(req.usuario)).map(a => a.evento));
    if (ids.some(id => !disponibles.has(id))) return res.status(403).json({ error: { mensaje: 'Una notificación no está disponible para tu cuenta.' } });
    await Lectura.bulkWrite([...new Set(ids)].map(evento => ({ updateOne: { filter: { _id: `${req.usuario.id}:${evento}` }, update: { $setOnInsert: { usuario: req.usuario.id, evento, fecha: new Date() } }, upsert: true } })));
    res.json({ mensaje: 'Notificaciones marcadas como leídas.' });
  } catch (error) { next(error); }
});
module.exports = router;
