const { Schema, model } = require('mongoose');

const disponibilidadSchema = new Schema(
  {
    monitor: {
      type: Schema.Types.ObjectId,
      ref: 'Usuario',
      required: [true, 'El monitor es obligatorio'],
    },

    fecha: {
      type: Date,
      required: [true, 'La fecha es obligatoria'],
    },

    horaInicio: {
      type: String,
      required: [true, 'La hora de inicio es obligatoria'],
      trim: true,
      match: [
        /^([01]\d|2[0-3]):[0-5]\d$/,
        'La hora de inicio debe tener el formato HH:MM',
      ],
    },

    horaFin: {
      type: String,
      required: [true, 'La hora de fin es obligatoria'],
      trim: true,
      match: [
        /^([01]\d|2[0-3]):[0-5]\d$/,
        'La hora de fin debe tener el formato HH:MM',
      ],
    },

    estado: {
      type: String,
      enum: [
        'Disponible',
        'Bloqueado',
        'Reservado',
      ],
      default: 'Disponible',
    },
  },
  {
    collection: 'disponibilidades',
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
  'Disponibilidad',
  disponibilidadSchema
);