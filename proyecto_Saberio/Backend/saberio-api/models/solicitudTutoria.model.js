const { Schema, model } = require('mongoose');

const solicitudTutoriaSchema = new Schema(
  {
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

    materia: {
      type: Schema.Types.ObjectId,
      ref: 'Materia',
      required: [true, 'La materia es obligatoria'],
    },

    tema: {
      type: String,
      required: [true, 'El tema es obligatorio'],
      trim: true,
      minlength: [5, 'El tema debe tener al menos 5 caracteres'],
      maxlength: [150, 'El tema no puede superar 150 caracteres'],
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
        values: ['Presencial', 'Virtual'],
        message: 'La modalidad {VALUE} no es válida',
      },
      required: [true, 'La modalidad es obligatoria'],
    },

    fechaPreferida: {
      type: Date,
      required: [true, 'La fecha preferida es obligatoria'],
    },

    horaPreferida: {
      type: String,
      required: [true, 'La hora preferida es obligatoria'],
      trim: true,
      match: [
        /^([01]\d|2[0-3]):[0-5]\d$/,
        'La hora debe tener el formato HH:MM',
      ],
    },

    duracionEstimadaHoras: {
      type: Number,
      required: [true, 'La duración estimada es obligatoria'],
      min: [1, 'La duración debe ser al menos 1 hora'],
      max: [8, 'La duración no puede superar 8 horas'],
    },

    estado: {
      type: String,
      enum: [
        'Pendiente',
        'Aceptada',
        'Rechazada',
        'Reprogramada',
        'Cancelada',
        'Completada',
      ],
      default: 'Pendiente',
    },

    respuestaMonitor: {
      type: String,
      trim: true,
      maxlength: [500, 'La respuesta del monitor no puede superar 500 caracteres'],
      default: '',
    },

    fechaRespuesta: {
      type: Date,
      default: null,
    },
  },
  {
    collection: 'solicitudes_tutoria',
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
  'SolicitudTutoria',
  solicitudTutoriaSchema
);