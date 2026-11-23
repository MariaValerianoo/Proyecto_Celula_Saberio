const HttpError = require('../utils/HttpError');

const FACULTADES = [
  'Ingeniería',
  'Economía',
  'Matemáticas',
  'Derecho',
];

function validarDatosMateria(datos, obligatorio) {
  const resultado = {};

  if (obligatorio || datos.nombre !== undefined) {
    if (
      typeof datos.nombre !== 'string' ||
      datos.nombre.trim().length < 3 ||
      datos.nombre.trim().length > 120
    ) {
      throw new HttpError(
        400,
        'El nombre debe tener entre 3 y 120 caracteres',
        'NOMBRE_MATERIA_INVALIDO'
      );
    }

    resultado.nombre = datos.nombre.trim();
  }

  if (obligatorio || datos.codigo !== undefined) {
    if (
      typeof datos.codigo !== 'string' ||
      datos.codigo.trim().length < 2 ||
      datos.codigo.trim().length > 20
    ) {
      throw new HttpError(
        400,
        'El código debe tener entre 2 y 20 caracteres',
        'CODIGO_MATERIA_INVALIDO'
      );
    }

    resultado.codigo = datos.codigo.trim().toUpperCase();
  }

  if (obligatorio || datos.facultad !== undefined) {
    if (!FACULTADES.includes(datos.facultad)) {
      throw new HttpError(
        400,
        'La facultad no es válida',
        'FACULTAD_INVALIDA'
      );
    }

    resultado.facultad = datos.facultad;
  }

  if (obligatorio || datos.creditos !== undefined) {
    const creditos = Number(datos.creditos);

    if (
      !Number.isInteger(creditos) ||
      creditos < 1 ||
      creditos > 6
    ) {
      throw new HttpError(
        400,
        'Los créditos deben ser un número entero entre 1 y 6',
        'CREDITOS_INVALIDOS'
      );
    }

    resultado.creditos = creditos;
  }

  return resultado;
}

function validarCreacionMateria(req, res, next) {
  try {
    const datos = req.body;

    if (
      !datos ||
      typeof datos !== 'object' ||
      Array.isArray(datos)
    ) {
      throw new HttpError(
        400,
        'Debes enviar un objeto JSON con los datos de la materia',
        'CUERPO_INVALIDO'
      );
    }

    const camposPermitidos = [
      'nombre',
      'codigo',
      'facultad',
      'creditos',
    ];

    const contieneCamposNoPermitidos = Object.keys(datos).some(
      (campo) => !camposPermitidos.includes(campo)
    );

    if (contieneCamposNoPermitidos) {
      throw new HttpError(
        400,
        'La solicitud contiene campos no permitidos',
        'CAMPOS_NO_PERMITIDOS'
      );
    }

    res.locals.materia = validarDatosMateria(datos, true);

    next();
  } catch (error) {
    next(error);
  }
}

function validarActualizacionMateria(req, res, next) {
  try {
    const datos = req.body;

    if (
      !datos ||
      typeof datos !== 'object' ||
      Array.isArray(datos)
    ) {
      throw new HttpError(
        400,
        'Debes enviar un objeto JSON con los datos a actualizar',
        'CUERPO_INVALIDO'
      );
    }

    const camposPermitidos = [
      'nombre',
      'codigo',
      'facultad',
      'creditos',
    ];

    const contieneCamposNoPermitidos = Object.keys(datos).some(
      (campo) => !camposPermitidos.includes(campo)
    );

    if (contieneCamposNoPermitidos) {
      throw new HttpError(
        400,
        'La solicitud contiene campos no permitidos',
        'CAMPOS_NO_PERMITIDOS'
      );
    }

    const actualizacion = validarDatosMateria(datos, false);

    if (Object.keys(actualizacion).length === 0) {
      throw new HttpError(
        400,
        'No se enviaron campos válidos para actualizar',
        'ACTUALIZACION_INVALIDA'
      );
    }

    res.locals.materia = actualizacion;

    next();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  validarCreacionMateria,
  validarActualizacionMateria,
};