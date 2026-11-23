const servicio = require('../services/soporteAcademico.service');
async function crear(req, res) {
  const soporte = await servicio.crear(req.usuario.id, res.locals.soporte, req.file);
  res.status(201).json({ mensaje: 'Soporte cargado correctamente', soporte });
}
async function listar(req, res) { res.status(200).json({ soportes: await servicio.listar() }); }
async function listarPropios(req, res) { res.status(200).json({ soportes: await servicio.listarPropios(req.usuario.id) }); }
async function obtenerPorId(req, res) { res.status(200).json({ soporte: await servicio.obtenerPorId(req.params.id, req.usuario) }); }
async function descargar(req, res, next) {
  try {
    const { soporte, rutaAbsoluta, contenido } = await servicio.descargar(req.params.id, req.usuario);
    res.set('Cache-Control', 'private, no-store');
    res.set('X-Content-Type-Options', 'nosniff');
    if (contenido) {
      res.attachment(soporte.nombreOriginal);
      res.type(soporte.tipoMime);
      return res.send(contenido);
    }
    return res.download(rutaAbsoluta, soporte.nombreOriginal, error => { if (error) next(error); });
  } catch (error) { next(error); }
}
async function revisar(req, res) { res.status(200).json({ mensaje: 'Soporte revisado correctamente', soporte: await servicio.revisar(req.params.id, req.body) }); }
async function eliminar(req, res) { await servicio.eliminar(req.params.id, req.usuario.id); res.status(200).json({ mensaje: 'Soporte eliminado correctamente' }); }
module.exports = { crear, listar, listarPropios, obtenerPorId, descargar, revisar, eliminar };
