const servicio = require('../services/materia.service');

async function crear(req, res) {
  const materia = await servicio.crearMateria(
    res.locals.materia
  );

  res.status(201).json({
    mensaje: 'Materia creada correctamente',
    materia,
  });
}

async function listar(req, res) {
  const materias = await servicio.listarMaterias();

  res.status(200).json({
    materias,
  });
}

async function obtener(req, res) {
  const materia = await servicio.obtenerMateria(
    req.params.id
  );

  res.status(200).json({
    materia,
  });
}

async function actualizar(req, res) {
  const materia = await servicio.actualizarMateria(
    req.params.id,
    res.locals.materia
  );

  res.status(200).json({
    mensaje: 'Materia actualizada correctamente',
    materia,
  });
}

async function cambiarEstado(req, res) {
  const { activa } = req.body;

  const materia = await servicio.cambiarEstadoMateria(
    req.params.id,
    activa
  );

  res.status(200).json({
    mensaje: materia.activa
      ? 'Materia activada correctamente'
      : 'Materia desactivada correctamente',
    materia,
  });
}

module.exports = {
  crear,
  listar,
  obtener,
  actualizar,
  cambiarEstado,
};