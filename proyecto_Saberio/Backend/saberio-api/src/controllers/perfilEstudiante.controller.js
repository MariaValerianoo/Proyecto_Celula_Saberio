const servicio = require('../services/perfilEstudiante.service');

async function obtener(req, res) {
  const perfil = await servicio.obtenerPerfil(
    req.usuario.id
  );

  res.status(200).json({
    perfil,
  });
}

async function guardar(req, res) {
  const perfil = await servicio.crearOActualizarPerfil(
    req.usuario.id,
    res.locals.perfilEstudiante
  );

  res.status(200).json({
    mensaje: 'Perfil de estudiante guardado correctamente',
    perfil,
  });
}

module.exports = {
  obtener,
  guardar,
};