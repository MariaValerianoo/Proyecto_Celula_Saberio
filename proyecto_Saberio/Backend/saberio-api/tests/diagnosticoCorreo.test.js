const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../src/services/correoProveedor.service.js'), 'utf8');
function fixture(env, fallo) {
  let verificaciones = 0; let envios = 0;
  const sandbox = { process: { env }, module: { exports: {} }, require: id => {
    if (id === '../utils/HttpError') return class extends Error { constructor(status, mensaje, codigo) { super(mensaje); this.status = status; this.codigo = codigo; } };
    if (id === 'nodemailer') return { createTransport: () => ({ verify: async () => { verificaciones++; if (fallo) throw fallo; return true; }, sendMail: async () => { envios++; } }) };
    throw new Error('Dependencia inesperada');
  } };
  vm.runInNewContext(source, sandbox);
  return { ...sandbox.module.exports, contadores: () => ({ verificaciones, envios }) };
}
const env = { CORREO_PROVEEDOR: 'gmail', GMAIL_USER: 'remitente@gmail.com', GMAIL_APP_PASSWORD: 'secreto-simulado' };
test('el diagnóstico comprueba SMTP sin enviar un correo', async () => {
  const f = fixture(env); const result = await f.verificarConfiguracionCorreo();
  assert.equal(result.smtpVerificado, true); assert.equal(result.envioRealizado, false); assert.equal(result.recepcionVerificada, false);
  assert.deepEqual(f.contadores(), { verificaciones: 1, envios: 0 });
});
test('el estado indica variables ausentes sin devolver sus valores', () => {
  const f = fixture({ CORREO_PROVEEDOR: 'gmail', GMAIL_USER: env.GMAIL_USER });
  const result = f.obtenerEstadoCorreo();
  assert.equal(result.configurado, false); assert.ok(result.variablesPendientes.includes('GMAIL_APP_PASSWORD'));
  assert.equal(JSON.stringify(result).includes(env.GMAIL_USER), false);
});
test('el estado completo tampoco revela remitente ni contraseña', () => {
  const result = fixture(env).obtenerEstadoCorreo();
  assert.equal(result.configurado, true); assert.equal(JSON.stringify(result).includes(env.GMAIL_APP_PASSWORD), false); assert.equal(JSON.stringify(result).includes(env.GMAIL_USER), false);
});
test('sin configuración no se intenta conectar', async () => {
  const f = fixture({ CORREO_PROVEEDOR: 'gmail' });
  await assert.rejects(f.verificarConfiguracionCorreo(), e => e.codigo === 'GMAIL_NO_CONFIGURADO');
  assert.deepEqual(f.contadores(), { verificaciones: 0, envios: 0 });
});
test('autenticación rechazada genera un error seguro', async () => {
  const f = fixture(env, Object.assign(new Error(env.GMAIL_APP_PASSWORD), { code: 'EAUTH' }));
  await assert.rejects(f.verificarConfiguracionCorreo(), e => e.codigo === 'GMAIL_AUTENTICACION_FALLIDA' && !e.message.includes(env.GMAIL_APP_PASSWORD));
});
test('tiempo agotado y fallo de conexión tienen diagnósticos diferenciados', async () => {
  await assert.rejects(fixture(env, { code: 'ETIMEDOUT' }).verificarConfiguracionCorreo(), e => e.status === 504);
  await assert.rejects(fixture(env, { code: 'ESOCKET' }).verificarConfiguracionCorreo(), e => e.codigo === 'GMAIL_CONEXION_FALLIDA');
});
