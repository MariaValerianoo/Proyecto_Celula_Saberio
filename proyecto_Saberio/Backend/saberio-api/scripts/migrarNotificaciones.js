require('dotenv').config();
const mongoose = require('mongoose');
const Usuario = require('../models/usuario.model');
const Soporte = require('../models/soporteAcademico.model');
const n = require('../src/services/notificacionInterna.service');
async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI requerida en entorno local seguro');
  await mongoose.connect(process.env.MONGODB_URI);
  let procesados = 0;
  const admins = await Usuario.find({ roles: 'admin', correoVerificado: true, estadoCuenta: 'habilitada' }).select('_id').lean();
  const eventos = require('../src/utils/eventosNotificacion');
  for await (const s of Soporte.find().cursor()) {
    for (const admin of admins) await n.crear(eventos.soporte(s, admin._id));
    if (['Aprobado', 'Rechazado'].includes(s.estado)) await n.revisionSoporte(s);
    procesados++;
  }
  console.log(JSON.stringify({ soportesProcesados: procesados }));
}
main().catch(() => { console.error('MIGRACION_NO_COMPLETADA'); process.exitCode = 1; }).finally(() => mongoose.disconnect());
