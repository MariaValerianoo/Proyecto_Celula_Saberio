const Materia = require('../../models/materia.model');
const HttpError = require('../utils/HttpError');

async function crearMateria(datos) {
  await Materia.init();

  const existe = await Materia.exists({
    codigo: datos.codigo,
  });

  if (existe) {
    throw new HttpError(
      409,
      'Ya existe una materia con este código',
      'MATERIA_DUPLICADA'
    );
  }

  const materia = await Materia.create(datos);

  return materia;
}

async function listarMaterias() {
  const materias = await Materia.find().sort({
    nombre: 1,
  });

  return materias;
}

async function obtenerMateria(id) {
  const materia = await Materia.findById(id);

  if (!materia) {
    throw new HttpError(
      404,
      'No se encontró la materia solicitada',
      'MATERIA_NO_ENCONTRADA'
    );
  }

  return materia;
}

async function actualizarMateria(id, datos) {
  const materia = await Materia.findByIdAndUpdate(
    id,
    datos,
    {
      returnDocument: 'after',
      runValidators: true,
    }
  );

  if (!materia) {
    throw new HttpError(
      404,
      'No se encontró la materia solicitada',
      'MATERIA_NO_ENCONTRADA'
    );
  }

  return materia;
}

async function cambiarEstadoMateria(id, activa) {
  const materia = await Materia.findByIdAndUpdate(
    id,
    { activa },
    {
      returnDocument: 'after',
      runValidators: true,
    }
  );

  if (!materia) {
    throw new HttpError(
      404,
      'No se encontró la materia solicitada',
      'MATERIA_NO_ENCONTRADA'
    );
  }

  return materia;
}

module.exports = {
  crearMateria,
  listarMaterias,
  obtenerMateria,
  actualizarMateria,
  cambiarEstadoMateria,
};