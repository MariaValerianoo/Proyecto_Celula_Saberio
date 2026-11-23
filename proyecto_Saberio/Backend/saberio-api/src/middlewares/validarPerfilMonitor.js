const HttpError = require('../utils/HttpError');

const MODALIDADES_VALIDAS = [
  'Presencial',
  'Virtual',
  'Ambas',
];

const CAMPOS_PERMITIDOS = [
  'biografia',
  'experienciaAcademica',
  'enfoqueEnsenanza',
  'materiasOfrecidas',
  'tarifaPorHora',
  'modalidades',
  'disponibilidadHoraria',
];

function validarPerfilMonitor(req, res, next) {
  try {
    const datos = req.body;

    if (
      !datos ||
      typeof datos !== 'object' ||
      Array.isArray(datos)
    ) {
      throw new HttpError(
        400,
        'Debes enviar un objeto JSON con los datos del perfil',
        'CUERPO_INVALIDO'
      );
    }

    const contieneCamposNoPermitidos = Object.keys(datos).some(
      (campo) => !CAMPOS_PERMITIDOS.includes(campo)
    );

    if (contieneCamposNoPermitidos) {
      throw new HttpError(
        400,
        'La solicitud contiene campos no permitidos',
        'CAMPOS_NO_PERMITIDOS'
      );
    }

    const {
      biografia,
      experienciaAcademica,
      enfoqueEnsenanza,
      materiasOfrecidas,
      tarifaPorHora,
      modalidades,
      disponibilidadHoraria,
    } = datos;

    if (
      typeof biografia !== 'string' ||
      biografia.trim().length < 20 ||
      biografia.trim().length > 1000
    ) {
      throw new HttpError(
        400,
        'La biografía debe tener entre 20 y 1000 caracteres',
        'BIOGRAFIA_INVALIDA'
      );
    }

    if (
      typeof experienciaAcademica !== 'string' ||
      experienciaAcademica.trim().length < 20 ||
      experienciaAcademica.trim().length > 1000
    ) {
      throw new HttpError(
        400,
        'La experiencia académica debe tener entre 20 y 1000 caracteres',
        'EXPERIENCIA_INVALIDA'
      );
    }

    if (
      typeof enfoqueEnsenanza !== 'string' ||
      enfoqueEnsenanza.trim().length < 20 ||
      enfoqueEnsenanza.trim().length > 1000
    ) {
      throw new HttpError(
        400,
        'El enfoque de enseñanza debe tener entre 20 y 1000 caracteres',
        'ENFOQUE_INVALIDO'
      );
    }

    if (
      !Array.isArray(materiasOfrecidas) ||
      materiasOfrecidas.length === 0 ||
      materiasOfrecidas.some(
        (materia) => typeof materia !== 'string' || !materia.trim()
      )
    ) {
      throw new HttpError(
        400,
        'Debes seleccionar al menos una materia',
        'MATERIAS_INVALIDAS'
      );
    }

    const tarifa = Number(tarifaPorHora);

    if (
      !Number.isFinite(tarifa) ||
      tarifa < 0 ||
      tarifa > 1000000
    ) {
      throw new HttpError(
        400,
        'La tarifa por hora no es válida',
        'TARIFA_INVALIDA'
      );
    }

    if (
      !Array.isArray(modalidades) ||
      modalidades.length === 0 ||
      modalidades.some(
        (modalidad) => !MODALIDADES_VALIDAS.includes(modalidad)
      )
    ) {
      throw new HttpError(
        400,
        'Las modalidades no son válidas',
        'MODALIDADES_INVALIDAS'
      );
    }

    if (
      typeof disponibilidadHoraria !== 'string' ||
      disponibilidadHoraria.trim().length < 10 ||
      disponibilidadHoraria.trim().length > 500
    ) {
      throw new HttpError(
        400,
        'La disponibilidad horaria debe tener entre 10 y 500 caracteres',
        'DISPONIBILIDAD_INVALIDA'
      );
    }

    res.locals.perfilMonitor = {
      biografia: biografia.trim(),
      experienciaAcademica: experienciaAcademica.trim(),
      enfoqueEnsenanza: enfoqueEnsenanza.trim(),
      materiasOfrecidas,
      tarifaPorHora: tarifa,
      modalidades,
      disponibilidadHoraria: disponibilidadHoraria.trim(),
    };

    next();
  } catch (error) {
    next(error);
  }
}

module.exports = validarPerfilMonitor;