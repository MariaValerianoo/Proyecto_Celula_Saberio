const { createHash } = require('node:crypto');
const SesionRevocada = require('../../models/sesionRevocada.model');
const { verificarTokenSesion, EXPIRACION_SEGUNDOS } = require('../utils/jwt');
function huella(token) { return createHash('sha256').update(token).digest('hex'); }
async function revocar(token) {
  if (!token || typeof token !== 'string') return;
  try { verificarTokenSesion(token); }
  catch (error) { if (error.status === 401 || error.statusCode === 401) return; throw error; }
  await SesionRevocada.updateOne({ _id: huella(token) }, { $setOnInsert: { venceEn: new Date(Date.now() + EXPIRACION_SEGUNDOS * 1000) } }, { upsert: true });
}
async function estaRevocada(token) { return Boolean(await SesionRevocada.exists({ _id: huella(token) })); }
module.exports = { revocar, estaRevocada };
