const servicio = require('../services/busqueda.service');

async function buscarMonitores(req, res) {
  const resultados =
    await servicio.buscarMonitores(
      req.query
    );

  res.status(200).json({
    monitores: resultados,
  });
}

async function obtenerPerfilPublico(req, res) {
  const perfil =
    await servicio.obtenerPerfilPublico(
      req.params.id
    );

  res.status(200).json({
    monitor: perfil,
  });
}

module.exports = {
  buscarMonitores,
  obtenerPerfilPublico,
};