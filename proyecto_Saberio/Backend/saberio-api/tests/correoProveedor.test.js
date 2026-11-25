const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../src/services/correoProveedor.service.js'), 'utf8');
function fixture(env = {}, response = { accepted: ['persona@unal.edu.co'], rejected: [] }) {
  const sent = []; const microsoft = []; const configs = [];
  const sandbox = { process: { env }, module: { exports: {} }, require: id => {
    if (id === '../utils/HttpError') return class extends Error { constructor(status, message, codigo) { super(message); this.status = status; this.codigo = codigo; } };
    if (id === 'nodemailer') return { createTransport: config => { configs.push(config); return { sendMail: async msg => { sent.push(msg); if (response instanceof Error) throw response; return response; } }; } };
    if (id === './correoMicrosoft.service') return { enviarCorreo: async msg => { microsoft.push(msg); return { aceptado: true }; } };
    throw new Error('Dependencia inesperada');
  } };
  vm.runInNewContext(source, sandbox);
  return { ...sandbox.module.exports, sent, microsoft, configs };
}
const mensaje = { destinatario: ' PERSONA@UNAL.EDU.CO ', asunto: 'Saberio: prueba', texto: 'Contenido de prueba' };
const gmail = { CORREO_PROVEEDOR: 'gmail', GMAIL_USER: 'remitente@gmail.com', GMAIL_APP_PASSWORD: 'clave-de-prueba' };
test('Gmail acepta otro proveedor sin cambiar el remitente', async () => {
  const f = fixture(gmail); const result = await f.enviarCorreo(mensaje);
  assert.equal(result.aceptado, true); assert.equal(f.sent.length, 1);
  assert.equal(f.sent[0].to, 'persona@unal.edu.co'); assert.equal(f.sent[0].from.address, gmail.GMAIL_USER);
  assert.equal(f.configs[0].secure, true); assert.equal(f.configs[0].port, 465);
});
test('sin credenciales Gmail no se anuncia éxito ni se intenta SMTP', async () => {
  const f = fixture({ CORREO_PROVEEDOR: 'gmail' });
  await assert.rejects(f.enviarCorreo(mensaje), e => e.codigo === 'GMAIL_NO_CONFIGURADO'); assert.equal(f.sent.length, 0);
});
test('se mantiene Microsoft cuando no se configuró Gmail', async () => {
  const f = fixture(); await f.enviarCorreo(mensaje); assert.equal(f.microsoft.length, 1); assert.equal(f.sent.length, 0);
});
test('rechaza inyección de cabeceras antes del envío', async () => {
  const f = fixture(gmail); await assert.rejects(f.enviarCorreo({ ...mensaje, asunto: 'Hola\r\nBcc: otro@ejemplo.com' }), e => e.codigo === 'ASUNTO_INVALIDO'); assert.equal(f.sent.length, 0);
});
test('no confunde rechazo del servidor con aceptación', async () => {
  const f = fixture(gmail, { accepted: [], rejected: ['persona@unal.edu.co'] });
  await assert.rejects(f.enviarCorreo(mensaje), e => e.codigo === 'ENVIO_CORREO_NO_CONFIRMADO');
});
test('un fallo de SMTP no revela secretos ni reintenta automáticamente', async () => {
  const f = fixture(gmail, new Error('secreto-interno'));
  await assert.rejects(f.enviarCorreo(mensaje), e => e.codigo === 'ENVIO_CORREO_NO_CONFIRMADO' && !e.message.includes('secreto-interno')); assert.equal(f.sent.length, 1);
});
