const { Schema, model, models } = require('mongoose');
const schema = new Schema({
  usuario: { type: Schema.Types.ObjectId, ref: 'Usuario', required: true },
  evento: { type: String, required: true, maxlength: 100 },
  recursoTipo: { type: String, enum: ['solicitud_tutoria', 'soporte_academico'], required: true },
  recursoId: { type: Schema.Types.ObjectId, required: true },
  title: { type: String, required: true, maxlength: 150 },
  text: { type: String, required: true, maxlength: 500 },
  details: { type: String, default: '', maxlength: 1500 },
  href: { type: String, required: true, maxlength: 200 },
  type: { type: String, enum: ['request', 'success', 'warning'], required: true },
  read: { type: Boolean, default: false }, fechaLectura: { type: Date, default: null },
  fecha: { type: Date, required: true },
}, { collection: 'notificaciones', timestamps: true, versionKey: false });
schema.index({ usuario: 1, evento: 1 }, { unique: true });
schema.index({ usuario: 1, read: 1, fecha: -1, _id: -1 });
module.exports = models.Notificacion || model('Notificacion', schema);
