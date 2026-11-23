const servicio = require('../services/evaluacion.service');

async function crear(req, res) {
  const evaluacion = await servicio.crear(
    req.usuario.id,
    res.locals.evaluacion
  );

  res.status(201).json({
    mensaje: 'Evaluación registrada correctamente',
    evaluacion,
  });
}

async function listarPorMonitor(req, res) {
  const evaluaciones = await servicio.listarPorMonitor(
    req.params.id
  );

  res.status(200).json({
    evaluaciones,
  });
}

async function obtenerPromedio(req, res) {
  const resultado = await servicio.obtenerPromedio(
    req.params.id
  );

  res.status(200).json({
    evaluacion: resultado,
  });
}

module.exports = {
  crear,
  listarPorMonitor,
  obtenerPromedio,
};