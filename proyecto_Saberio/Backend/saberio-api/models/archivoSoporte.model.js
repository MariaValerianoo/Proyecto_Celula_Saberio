const { Schema, model, models } = require('mongoose');
const schema = new Schema({ contenido: { type: Buffer, required: true, select: false } }, { collection: 'archivos_soportes', timestamps: true, versionKey: false });
module.exports = models.ArchivoSoporte || model('ArchivoSoporte', schema);
