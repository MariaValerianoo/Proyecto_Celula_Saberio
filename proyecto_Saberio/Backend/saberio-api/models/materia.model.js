const { Schema, model } = require('mongoose');

const materiaSchema = new Schema(
  {
    codigo: {
      type: String,
      required: [true, 'El código es obligatorio'],
      trim: true,
      uppercase: true,
      minlength: [2, 'El código debe tener al menos 2 caracteres'],
      maxlength: [20, 'El código no puede superar 20 caracteres'],
    },

    nombre: {
      type: String,
      required: [true, 'El nombre es obligatorio'],
      trim: true,
      minlength: [3, 'El nombre debe tener al menos 3 caracteres'],
      maxlength: [120, 'El nombre no puede superar 120 caracteres'],
    },

    facultad: {
      type: String,
      required: [true, 'La facultad es obligatoria'],
      trim: true,
      enum: {
        values: [
          'Ingeniería',
          'Economía',
          'Matemáticas',
          'Derecho',
        ],
        message: 'La facultad {VALUE} no es válida',
      },
    },

    creditos: {
      type: Number,
      required: [true, 'Los créditos son obligatorios'],
      min: [1, 'Los créditos deben ser al menos 1'],
      max: [6, 'Los créditos no pueden superar 6'],
    },

    activa: {
      type: Boolean,
      default: true,
    },
  },
  {
    collection: 'materias',
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

materiaSchema.index({ codigo: 1 }, { unique: true });

module.exports = model('Materia', materiaSchema);