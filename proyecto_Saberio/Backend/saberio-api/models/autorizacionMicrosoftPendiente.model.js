const mongoose = require('mongoose');

const autorizacionMicrosoftPendienteSchema = new mongoose.Schema(
  {
    estadoHash: {
      type: String,
      required: true,
      unique: true,
    },
    verificadorCifrado: {
      type: String,
      required: true,
    },
    expiraEn: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

autorizacionMicrosoftPendienteSchema.index(
  { expiraEn: 1 },
  { expireAfterSeconds: 0 }
);

module.exports =
  mongoose.models.AutorizacionMicrosoftPendiente ||
  mongoose.model(
    'AutorizacionMicrosoftPendiente',
    autorizacionMicrosoftPendienteSchema
  );
