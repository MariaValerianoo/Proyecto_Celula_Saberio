const { Schema, model } = require('mongoose');
const schema = new Schema({
  _id: { type: String, required: true },
  venceEn: { type: Date, required: true, expires: 0 },
}, { collection: 'sesiones_revocadas', versionKey: false });
module.exports = model('SesionRevocada', schema);
