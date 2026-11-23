const PerfilMonitor = require('../../models/perfilMonitor.model');
const HttpError = require('../utils/HttpError');

const CAMPOS_EDITABLES = [
  'biografia',
  'experienciaAcademica',
  'enfoqueEnsenanza',
  'materiasOfrecidas',
  'tarifaPorHora',
  'modalidades',
  'disponibilidadHoraria',
];

async function obtenerPerfil(idUsuario) {
  const perfil = await PerfilMonitor.findOne({
    usuario: idUsuario,
  });

  if (!perfil) {
    throw new HttpError(
      404,
      'Aún no has creado tu perfil de monitor',
      'PERFIL_NO_ENCONTRADO'
    );
  }

  return perfil;
}

async function crearOActualizarPerfil(idUsuario, datos) {
  if (
    !datos ||
    typeof datos !== 'object' ||
    Array.isArray(datos)
  ) {
    throw new HttpError(
      400,
      'Debes enviar los datos del perfil',
      'CUERPO_INVALIDO'
    );
  }

  const contieneCamposNoPermitidos = Object.keys(
    datos
  ).some(
    (campo) => !CAMPOS_EDITABLES.includes(campo)
  );

  if (contieneCamposNoPermitidos) {
    throw new HttpError(
      400,
      'La solicitud contiene campos no permitidos',
      'CAMPOS_NO_PERMITIDOS'
    );
  }

  const camposActualizables = {};

  for (const campo of CAMPOS_EDITABLES) {
    if (
      Object.prototype.hasOwnProperty.call(
        datos,
        campo
      )
    ) {
      camposActualizables[campo] = datos[campo];
    }
  }

  const perfil = await PerfilMonitor.findOneAndUpdate(
    {
      usuario: idUsuario,
    },
    {
      $set: camposActualizables,
      $setOnInsert: {
        usuario: idUsuario,
        estadoPerfil: 'Pendiente',
        materiasAcreditadas: [],
      },
    },
    {
      upsert: true,
      returnDocument: 'after',
      runValidators: true,
      setDefaultsOnInsert: true,
    }
  );

  return perfil;
}

module.exports = {
  obtenerPerfil,
  crearOActualizarPerfil,
};