const { Schema, model } = require('mongoose');

const soporteAcademicoSchema = new Schema(
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

    tipoDocumento: {
      type: String,
      enum: {
        values: [
          'Documento de identidad',
          'Soporte académico',
        ],
        message: 'El tipo de documento {VALUE} no es válido',
      },
      required: [true, 'El tipo de documento es obligatorio'],
    },

    nombreOriginal: {
      type: String,
      required: [true, 'El nombre original es obligatorio'],
      trim: true,
    },

    nombreArchivo: {
      type: String,
      required: [true, 'El nombre del archivo es obligatorio'],
      trim: true,
    },

    rutaArchivo: {
      type: String,
      required: [true, 'La ruta del archivo es obligatoria'],
      trim: true,
    },

    tipoMime: {
      type: String,
      required: [true, 'El tipo de archivo es obligatorio'],
      trim: true,
    },

    tamanoBytes: {
      type: Number,
      required: [true, 'El tamaño del archivo es obligatorio'],
      min: [1, 'El archivo no puede estar vacío'],
      max: [
        5 * 1024 * 1024,
        'El archivo no puede superar 5 MB',
      ],
    },

    estado: {
      type: String,
      enum: {
        values: [
          'Pendiente',
          'Aprobado',
          'Rechazado',
        ],
        message: 'El estado {VALUE} no es válido',
      },
      default: 'Pendiente',
    },

    observacionesAdmin: {
      type: String,
      trim: true,
      maxlength: [
        500,
        'Las observaciones no pueden superar 500 caracteres',
      ],
      default: '',
    },

    fechaRevision: {
      type: Date,
      default: null,
    },
  },
  {
    collection: 'soportes_academicos',
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
  'SoporteAcademico',
  soporteAcademicoSchema
);