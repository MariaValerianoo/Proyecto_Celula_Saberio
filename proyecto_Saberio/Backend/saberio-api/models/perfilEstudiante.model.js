const { Schema, model } = require('mongoose');

const perfilEstudianteSchema = new Schema(
  {
    usuario: {
      type: Schema.Types.ObjectId,
      ref: 'Usuario',
      required: [true, 'El usuario es obligatorio'],
      unique: true,
    },

    carrera: {
      type: String,
      required: [true, 'La carrera es obligatoria'],
      trim: true,
      minlength: [3, 'La carrera debe tener al menos 3 caracteres'],
      maxlength: [120, 'La carrera no puede superar 120 caracteres'],
    },

    semestre: {
      type: Number,
      required: [true, 'El semestre es obligatorio'],
      min: [1, 'El semestre debe ser al menos 1'],
      max: [12, 'El semestre no puede superar 12'],
    },

    materiasInteres: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: 'Materia',
        },
      ],
      default: [],
    },

    disponibilidadPreferida: {
      type: String,
      trim: true,
      maxlength: [200, 'La disponibilidad no puede superar 200 caracteres'],
      default: '',
    },

    modalidadPreferida: {
      type: String,
      enum: {
        values: ['Presencial', 'Virtual', 'Ambas'],
        message: 'La modalidad {VALUE} no es válida',
      },
      required: [true, 'La modalidad preferida es obligatoria'],
    },
  },
  {
    collection: 'perfiles_estudiante',
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
  'PerfilEstudiante',
  perfilEstudianteSchema
);