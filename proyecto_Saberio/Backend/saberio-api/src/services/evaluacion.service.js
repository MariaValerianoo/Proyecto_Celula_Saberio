const Evaluacion = require('../../models/evaluacion.model');
const SesionTutoria = require('../../models/sesionTutoria.model');
const HttpError = require('../utils/HttpError');
const mongoose = require('mongoose');

async function crear(idEstudiante, datos) {
  const sesion = await SesionTutoria.findById(
    datos.sesion
  );

  if (!sesion) {
    throw new HttpError(
      404,
      'La sesión no existe',
      'SESION_NO_ENCONTRADA'
    );
  }

  if (sesion.estudiante.toString() !== idEstudiante) {
    throw new HttpError(
      403,
      'Solo el estudiante de la sesión puede evaluarla',
      'ACCESO_DENEGADO'
    );
  }

  if (sesion.estado !== 'Completada') {
    throw new HttpError(
      400,
      'Solo puedes evaluar una sesión completada',
      'SESION_NO_COMPLETADA'
    );
  }

  const evaluacionExistente = await Evaluacion.findOne({
    sesion: sesion._id,
  });

  if (evaluacionExistente) {
    throw new HttpError(
      400,
      'Ya evaluaste esta sesión',
      'EVALUACION_EXISTENTE'
    );
  }

  const evaluacion = await Evaluacion.create({
    sesion: sesion._id,
    estudiante: sesion.estudiante,
    monitor: sesion.monitor,
    calificacion: datos.calificacion,
    comentario: datos.comentario,
  });

  return evaluacion;
}

async function listarPorMonitor(idMonitor) {
  const evaluaciones = await Evaluacion.find({
    monitor: idMonitor,
  })
    .populate('estudiante', 'nombre')
    .populate('sesion', 'tema fecha hora')
    .sort({ createdAt: -1 });

  return evaluaciones;
}

async function obtenerPromedio(idMonitor) {
  const resultado = await Evaluacion.aggregate([
    {
      $match: {
        monitor: new mongoose.Types.ObjectId(idMonitor),
      },
    },
    {
      $group: {
        _id: '$monitor',
        promedio: {
          $avg: '$calificacion',
        },
        totalEvaluaciones: {
          $sum: 1,
        },
      },
    },
  ]);

  if (resultado.length === 0) {
    return {
      promedio: null,
      totalEvaluaciones: 0,
    };
  }

  return {
    promedio: Number(
      resultado[0].promedio.toFixed(2)
    ),
    totalEvaluaciones:
      resultado[0].totalEvaluaciones,
  };
}



module.exports = {
  crear,
  listarPorMonitor,
  obtenerPromedio,
};