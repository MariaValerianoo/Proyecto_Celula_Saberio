const servicio = require('../services/publicacion.service');

async function crear(req, res) {
  const publicacion = await servicio.crear(
    req.usuario.id,
    res.locals.publicacion
  );

  res.status(201).json({
    mensaje: 'Publicación creada correctamente',
    publicacion,
  });
}

async function listarActivas(req, res) {
  const publicaciones = await servicio.listarActivas();

  res.status(200).json({
    publicaciones,
  });
}

async function listarPropias(req, res) {
  const publicaciones = await servicio.listarPropias(
    req.usuario.id
  );

  res.status(200).json({
    publicaciones,
  });
}

async function obtenerPorId(req, res) {
  const publicacion = await servicio.obtenerPorId(
    req.params.id
  );

  res.status(200).json({
    publicacion,
  });
}

async function actualizar(req, res) {
  const publicacion = await servicio.actualizar(
    req.params.id,
    req.usuario.id,
    res.locals.publicacion
  );

  res.status(200).json({
    mensaje: 'Publicación actualizada correctamente',
    publicacion,
  });
}

async function cambiarEstado(req, res) {
  const publicacion = await servicio.cambiarEstado(
    req.params.id,
    req.usuario.id,
    req.body.activa
  );

  res.status(200).json({
    mensaje: 'Estado de la publicación actualizado correctamente',
    publicacion,
  });
}

async function eliminar(req, res) {
  await servicio.eliminar(
    req.params.id,
    req.usuario.id
  );

  res.status(200).json({
    mensaje: 'Publicación eliminada correctamente',
  });
}

module.exports = {
  crear,
  listarActivas,
  listarPropias,
  obtenerPorId,
  actualizar,
  cambiarEstado,
  eliminar,
};