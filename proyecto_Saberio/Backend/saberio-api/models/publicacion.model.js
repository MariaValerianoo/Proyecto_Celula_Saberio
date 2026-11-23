const { Schema, model } = require('mongoose');

const publicacionSchema = new Schema(
  {
    monitor: {
      type: Schema.Types.ObjectId,
      ref: 'Usuario',
      required: [true, 'El monitor es obligatorio'],
    },

    materia: {
      type: Schema.Types.ObjectId,
      ref: 'Materia',
      required: [true, 'La materia es obligatoria'],
    },

    descripcion: {
      type: String,
      required: [true, 'La descripción es obligatoria'],
      trim: true,
      minlength: [10, 'La descripción debe tener al menos 10 caracteres'],
      maxlength: [1000, 'La descripción no puede superar 1000 caracteres'],
    },

    modalidad: {
      type: String,
      enum: {
        values: [
          'Presencial',
          'Virtual',
          'Ambas',
        ],
        message: 'La modalidad {VALUE} no es válida',
      },
      required: [true, 'La modalidad es obligatoria'],
    },

    tarifaPorHora: {
      type: Number,
      required: [true, 'La tarifa por hora es obligatoria'],
      min: [0, 'La tarifa no puede ser negativa'],
      max: [1000000, 'La tarifa no puede superar 1.000.000'],
    },

    duracionMinutos: {
      type: Number,
      required: [true, 'La duración es obligatoria'],
      enum: {
        values: [60, 90, 120],
        message: 'La duración debe ser 60, 90 o 120 minutos',
      },
    },

    activa: {
      type: Boolean,
      default: true,
    },
  },
  {
    collection: 'publicaciones',
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
  'Publicacion',
  publicacionSchema
);