const { Schema, model } = require('mongoose');

const perfilMonitorSchema = new Schema(
  {
    usuario: {
      type: Schema.Types.ObjectId,
      ref: 'Usuario',
      required: [true, 'El usuario es obligatorio'],
      unique: true,
    },

    biografia: {
      type: String,
      required: [true, 'La biografía es obligatoria'],
      trim: true,
      minlength: [20, 'La biografía debe tener al menos 20 caracteres'],
      maxlength: [1000, 'La biografía no puede superar 1000 caracteres'],
    },

    experienciaAcademica: {
      type: String,
      required: [true, 'La experiencia académica es obligatoria'],
      trim: true,
      minlength: [20, 'La experiencia académica debe tener al menos 20 caracteres'],
      maxlength: [1000, 'La experiencia académica no puede superar 1000 caracteres'],
    },

    enfoqueEnsenanza: {
      type: String,
      required: [true, 'El enfoque de enseñanza es obligatorio'],
      trim: true,
      minlength: [20, 'El enfoque de enseñanza debe tener al menos 20 caracteres'],
      maxlength: [1000, 'El enfoque de enseñanza no puede superar 1000 caracteres'],
    },

    materiasOfrecidas: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: 'Materia',
        },
      ],
      required: [true, 'Debes seleccionar al menos una materia'],
      validate: {
        validator: function (materias) {
          return materias.length > 0;
        },
        message: 'Debes seleccionar al menos una materia',
      },
    },

    tarifaPorHora: {
      type: Number,
      required: [true, 'La tarifa por hora es obligatoria'],
      min: [0, 'La tarifa no puede ser negativa'],
      max: [1000000, 'La tarifa no puede superar 1.000.000'],
    },

    modalidades: {
      type: [String],
      required: [true, 'Debes seleccionar al menos una modalidad'],
      validate: {
        validator: function (modalidades) {
          return modalidades.length > 0;
        },
        message: 'Debes seleccionar al menos una modalidad',
      },
    },

    disponibilidadHoraria: {
      type: String,
      required: [true, 'La disponibilidad horaria es obligatoria'],
      trim: true,
      minlength: [10, 'La disponibilidad horaria debe tener al menos 10 caracteres'],
      maxlength: [500, 'La disponibilidad horaria no puede superar 500 caracteres'],
    },
    materiasAcreditadas: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: 'Materia',
        },
      ],
      default: [],
    },

    estadoPerfil: {
      type: String,
      enum: ['Pendiente', 'Aprobado', 'Rechazado'],
      default: 'Pendiente',
    },
  },
  {
    collection: 'perfiles_monitor',
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
  'PerfilMonitor',
  perfilMonitorSchema
);