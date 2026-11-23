const mongoose = require('mongoose');

const sesionMicrosoftSchema = new mongoose.Schema(
  {
    cuenta: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    homeAccountId: {
      type: String,
      required: true,
      trim: true,
    },
    cacheCifrada: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.models.SesionMicrosoft ||
  mongoose.model('SesionMicrosoft', sesionMicrosoftSchema);
