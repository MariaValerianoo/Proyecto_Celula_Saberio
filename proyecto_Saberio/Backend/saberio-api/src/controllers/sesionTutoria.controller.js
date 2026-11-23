const servicio = require('../services/sesionTutoria.service');

async function crear(req, res) {
  const sesion = await servicio.crear(
    req.usuario.id,
    res.locals.sesionTutoria
  );

  res.status(201).json({
    mensaje: 'Sesión de tutoría creada correctamente',
    sesion,
  });
}

async function listar(req, res) {
  const esMonitor = req.usuario.roles.includes('monitor');

  const sesiones = await servicio.listar(
    req.usuario.id,
    esMonitor ? 'monitor' : 'estudiante'
  );

  res.status(200).json({
    sesiones,
  });
}

async function obtenerPorId(req, res) {
  const esMonitor = req.usuario.roles.includes('monitor');

  const sesion = await servicio.obtenerPorId(
    req.params.id,
    req.usuario.id,
    esMonitor ? 'monitor' : 'estudiante'
  );

  res.status(200).json({
    sesion,
  });
}

async function finalizar(req, res) {
  const sesion = await servicio.finalizar(
    req.params.id,
    req.usuario.id,
    req.body.notas
  );

  res.status(200).json({
    mensaje: 'Sesión finalizada correctamente',
    sesion,
  });
}

module.exports = {
  crear,
  listar,
  obtenerPorId,
  finalizar,
};