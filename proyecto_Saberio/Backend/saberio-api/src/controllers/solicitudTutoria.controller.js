const servicio = require('../services/solicitudTutoria.service');

async function crear(req, res) {
  const solicitud = await servicio.crear(
    req.usuario.id,
    res.locals.solicitudTutoria
  );

  res.status(201).json({
    mensaje: 'Solicitud de tutoría creada correctamente',
    solicitud,
  });
}

async function listar(req, res) {
  const esMonitor = req.usuario.roles.includes('monitor');

  const solicitudes = await servicio.listar(
    req.usuario.id,
    esMonitor ? 'monitor' : 'estudiante'
  );

  res.status(200).json({
    solicitudes,
  });
}

async function obtenerPorId(req, res) {
  const esMonitor = req.usuario.roles.includes('monitor');

  const solicitud = await servicio.obtenerPorId(
    req.params.id,
    req.usuario.id,
    esMonitor ? 'monitor' : 'estudiante'
  );

  res.status(200).json({
    solicitud,
  });
}

async function actualizarEstado(req, res) {
  const solicitud = await servicio.actualizarEstado(
    req.params.id,
    req.usuario.id,
    req.body.estado,
    req.body.respuestaMonitor
  );

  res.status(200).json({
    mensaje: 'Estado de la solicitud actualizado correctamente',
    solicitud,
  });
}

module.exports = {
  crear,
  listar,
  obtenerPorId,
  actualizarEstado,
};