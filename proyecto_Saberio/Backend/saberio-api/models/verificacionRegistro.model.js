const { Schema, model } = require('mongoose');
const schema = new Schema({
  _id: { type: String, required: true },
  nonce: String, huella: String, venceEn: Date,
  creadoEn: Date, ventanaEn: Date,
  envios: { type: Number, default: 0 },
  intentos: { type: Number, default: 0 },
  enviado: { type: Boolean, default: false },
  confirmado: { type: Boolean, default: false },
  autorizacionHuella: String, autorizacionVenceEn: Date,
  consumida: { type: Boolean, default: false },
  eliminarEn: { type: Date, required: true, expires: 0 },
}, { collection: 'verificaciones_registro', versionKey: false });
module.exports = model('VerificacionRegistro', schema);
