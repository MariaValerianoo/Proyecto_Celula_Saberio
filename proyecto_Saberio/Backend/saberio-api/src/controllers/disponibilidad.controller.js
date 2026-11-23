const servicio = require('../services/disponibilidad.service');

async function crear(req, res) {
  const disponibilidad = await servicio.crear(
    req.usuario.id,
    res.locals.disponibilidad
  );

  res.status(201).json({
    mensaje:
      'Disponibilidad creada correctamente',
    disponibilidad,
  });
}

async function listarPropias(req, res) {
  const disponibilidades =
    await servicio.listarPropias(
      req.usuario.id
    );

  res.status(200).json({
    disponibilidades,
  });
}

async function listarDisponibles(req, res) {
  const disponibilidades =
    await servicio.listarDisponibles(
      req.params.id
    );

  res.status(200).json({
    disponibilidades,
  });
}

async function actualizarEstado(req, res) {
  const disponibilidad =
    await servicio.actualizarEstado(
      req.params.id,
      req.usuario.id,
      req.body.estado
    );

  res.status(200).json({
    mensaje:
      'Estado de disponibilidad actualizado correctamente',
    disponibilidad,
  });
}

async function eliminar(req, res) {
  await servicio.eliminar(
    req.params.id,
    req.usuario.id
  );

  res.status(200).json({
    mensaje:
      'Disponibilidad eliminada correctamente',
  });
}

module.exports = {
  crear,
  listarPropias,
  listarDisponibles,
  actualizarEstado,
  eliminar,
};