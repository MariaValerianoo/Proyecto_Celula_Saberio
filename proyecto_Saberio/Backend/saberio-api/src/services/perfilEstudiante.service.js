const PerfilEstudiante = require('../../models/perfilEstudiante.model');
const HttpError = require('../utils/HttpError');

async function obtenerPerfil(idUsuario) {
  const perfil = await PerfilEstudiante.findOne({
    usuario: idUsuario,
  });

  if (!perfil) {
    throw new HttpError(
      404,
      'Aún no has creado tu perfil de estudiante',
      'PERFIL_NO_ENCONTRADO'
    );
  }

  return perfil;
}

async function crearOActualizarPerfil(idUsuario, datos) {
  const perfil = await PerfilEstudiante.findOneAndUpdate(
    { usuario: idUsuario },
    { ...datos, usuario: idUsuario },
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