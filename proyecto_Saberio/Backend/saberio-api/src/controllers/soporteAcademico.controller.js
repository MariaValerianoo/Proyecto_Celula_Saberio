const servicio = require('../services/soporteAcademico.service');

async function crear(req, res) {
  const soporte = await servicio.crear(
    req.usuario.id,
    res.locals.soporte,
    req.file
  );

  res.status(201).json({
    mensaje: 'Soporte cargado correctamente',
    soporte,
  });
}

async function listar(req, res) {
  const soportes = await servicio.listar();

  res.status(200).json({
    soportes,
  });
}

async function listarPropios(req, res) {
  const soportes = await servicio.listarPropios(
    req.usuario.id
  );

  res.status(200).json({
    soportes,
  });
}

async function obtenerPorId(req, res) {
  const soporte = await servicio.obtenerPorId(
    req.params.id,
    req.usuario
  );

  res.status(200).json({
    soporte,
  });
}

async function descargar(req, res, next) {
  try {
    const { soporte, rutaAbsoluta } =
      await servicio.descargar(
        req.params.id,
        req.usuario
      );

    res.download(
      rutaAbsoluta,
      soporte.nombreOriginal,
      (error) => {
        if (error) {
          next(error);
        }
      }
    );
  } catch (error) {
    next(error);
  }
}

async function revisar(req, res) {
  const soporte = await servicio.revisar(
    req.params.id,
    req.body
  );

  res.status(200).json({
    mensaje: 'Soporte revisado correctamente',
    soporte,
  });
}

async function eliminar(req, res) {
  await servicio.eliminar(
    req.params.id,
    req.usuario.id
  );

  res.status(200).json({
    mensaje: 'Soporte eliminado correctamente',
  });
}

module.exports = {
  crear,
  listar,
  listarPropios,
  obtenerPorId,
  descargar,
  revisar,
  eliminar,
};