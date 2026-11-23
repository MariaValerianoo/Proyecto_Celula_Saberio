const HttpError = require('../utils/HttpError');

const MODALIDADES = [
  'Presencial',
  'Virtual',
  'Ambas',
];

const CAMPOS_PERMITIDOS = [
  'carrera',
  'semestre',
  'materiasInteres',
  'disponibilidadPreferida',
  'modalidadPreferida',
];

function validarPerfilEstudiante(req, res, next) {
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

    const { carrera, semestre, materiasInteres, disponibilidadPreferida, modalidadPreferida } =
      datos;

    if (
      typeof carrera !== 'string' ||
      carrera.trim().length < 3 ||
      carrera.trim().length > 120
    ) {
      throw new HttpError(
        400,
        'La carrera debe tener entre 3 y 120 caracteres',
        'CARRERA_INVALIDA'
      );
    }

    const semestreNumero = Number(semestre);

    if (
      !Number.isInteger(semestreNumero) ||
      semestreNumero < 1 ||
      semestreNumero > 12
    ) {
      throw new HttpError(
        400,
        'El semestre debe ser un número entero entre 1 y 12',
        'SEMESTRE_INVALIDO'
      );
    }

    if (
      !Array.isArray(materiasInteres) ||
      materiasInteres.some(
        (materia) => typeof materia !== 'string' || !materia.trim()
      )
    ) {
      throw new HttpError(
        400,
        'Las materias de interés deben ser una lista de identificadores válidos',
        'MATERIAS_INTERES_INVALIDAS'
      );
    }

    if (
      disponibilidadPreferida !== undefined &&
      (typeof disponibilidadPreferida !== 'string' ||
        disponibilidadPreferida.length > 200)
    ) {
      throw new HttpError(
        400,
        'La disponibilidad preferida no puede superar 200 caracteres',
        'DISPONIBILIDAD_INVALIDA'
      );
    }

    if (!MODALIDADES.includes(modalidadPreferida)) {
      throw new HttpError(
        400,
        'La modalidad preferida no es válida',
        'MODALIDAD_INVALIDA'
      );
    }

    res.locals.perfilEstudiante = {
      carrera: carrera.trim(),
      semestre: semestreNumero,
      materiasInteres,
      disponibilidadPreferida:
        disponibilidadPreferida?.trim() || '',
      modalidadPreferida,
    };

    next();
  } catch (error) {
    next(error);
  }
}

module.exports = validarPerfilEstudiante;