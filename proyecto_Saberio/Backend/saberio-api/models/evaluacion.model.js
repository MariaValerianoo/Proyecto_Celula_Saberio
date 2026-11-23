const { Schema, model } = require('mongoose');

const evaluacionSchema = new Schema(
  {
    sesion: {
      type: Schema.Types.ObjectId,
      ref: 'SesionTutoria',
      required: [true, 'La sesión es obligatoria'],
      unique: true,
    },

    estudiante: {
      type: Schema.Types.ObjectId,
      ref: 'Usuario',
      required: [true, 'El estudiante es obligatorio'],
    },

    monitor: {
      type: Schema.Types.ObjectId,
      ref: 'Usuario',
      required: [true, 'El monitor es obligatorio'],
    },

    calificacion: {
      type: Number,
      required: [true, 'La calificación es obligatoria'],
      min: [1, 'La calificación mínima es 1'],
      max: [5, 'La calificación máxima es 5'],
    },

    comentario: {
      type: String,
      trim: true,
      maxlength: [500, 'El comentario no puede superar 500 caracteres'],
      default: '',
    },
  },
  {
    collection: 'evaluaciones',
    timestamps: true,
    versionKey: false,

    toJSON: {
      transform: function (documento, objeto) {
        objeto.id = objeto._id.toString();
        delete objeto._id;
        return objeto;
      },
    },
  }
);

module.exports = model(
  'Evaluacion',
  evaluacionSchema
);