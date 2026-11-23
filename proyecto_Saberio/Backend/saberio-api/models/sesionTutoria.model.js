const { Schema, model } = require('mongoose');

const sesionTutoriaSchema = new Schema(
  {
    solicitud: {
      type: Schema.Types.ObjectId,
      ref: 'SolicitudTutoria',
      required: [true, 'La solicitud es obligatoria'],
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

    modalidad: {
      type: String,
      enum: {
        values: ['Presencial', 'Virtual'],
        message: 'La modalidad {VALUE} no es válida',
      },
      required: [true, 'La modalidad es obligatoria'],
    },

    fecha: {
      type: Date,
      required: [true, 'La fecha es obligatoria'],
    },

    hora: {
      type: String,
      required: [true, 'La hora es obligatoria'],
      trim: true,
      match: [
        /^([01]\d|2[0-3]):[0-5]\d$/,
        'La hora debe tener el formato HH:MM',
      ],
    },

    duracionHoras: {
      type: Number,
      required: [true, 'La duración es obligatoria'],
      min: [1, 'La duración debe ser al menos 1 hora'],
      max: [8, 'La duración no puede superar 8 horas'],
    },

    lugarOEnlace: {
      type: String,
      trim: true,
      maxlength: [300, 'El lugar o enlace no puede superar 300 caracteres'],
      default: '',
    },

    notas: {
      type: String,
      trim: true,
      maxlength: [2000, 'Las notas no pueden superar 2000 caracteres'],
      default: '',
    },

    estado: {
      type: String,
      enum: [
        'Programada',
        'Completada',
        'Cancelada',
      ],
      default: 'Programada',
    },

    fechaFinalizacion: {
      type: Date,
      default: null,
    },
  },
  {
    collection: 'sesiones_tutoria',
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
  'SesionTutoria',
  sesionTutoriaSchema
);