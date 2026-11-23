const HttpError = require('../utils/HttpError');

const TIPOS_DOCUMENTO_VALIDOS = [
  'Documento de identidad',
  'Soporte académico',
];

function validarSoporteAcademico(
  req,
  res,
  next
) {
  try {
    const { tipoDocumento, materia } =
      req.body;

    if (
      !tipoDocumento ||
      !TIPOS_DOCUMENTO_VALIDOS.includes(
        tipoDocumento
      )
    ) {
      throw new HttpError(
        400,
        'El tipo de documento no es válido',
        'TIPO_DOCUMENTO_INVALIDO'
      );
    }

    if (
      typeof materia !== 'string' ||
      !materia.trim()
    ) {
      throw new HttpError(
        400,
        'Debes indicar la materia asociada al soporte',
        'MATERIA_INVALIDA'
      );
    }

    if (!req.file) {
      throw new HttpError(
        400,
        'Debes cargar un archivo PDF, PNG o JPG',
        'ARCHIVO_REQUERIDO'
      );
    }

    res.locals.soporte = {
      tipoDocumento,
      materia,
    };

    next();
  } catch (error) {
    next(error);
  }
}

module.exports = validarSoporteAcademico;