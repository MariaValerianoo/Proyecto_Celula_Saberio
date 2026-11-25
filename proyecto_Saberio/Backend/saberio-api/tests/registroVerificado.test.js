const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const source = fs.readFileSync(path.join(__dirname, '../src/services/registroVerificado.service.js'), 'utf8');
function fixture({ existente = false, coincide = true, falloEnvio = false } = {}) {
  let doc; let sends = 0; let creates = 0; let codeChecks = 0;
  function matches(filter) {
    if (!doc) return false;
    return Object.entries(filter).every(([key, value]) => {
      if (key === '$or') return value.some(part => matches(part));
      if (value && typeof value === 'object' && !(value instanceof Date) && !('getTime' in value)) {
        return Object.entries(value).every(([op, expected]) => op === '$gt' ? doc[key] > expected : op === '$lte' ? doc[key] <= expected : op === '$lt' ? doc[key] < expected : op === '$eq' ? doc[key] === expected : op === '$exists' ? (doc[key] !== undefined) === expected : false);
      }
      return doc[key] === value;
    });
  }
  const Desafio = {
    init: async () => {},
    updateOne: async (f, u) => { if (!doc) doc = { _id: f._id, ...u.$setOnInsert }; },
    findById: () => ({ lean: async () => doc && ({ ...doc }) }),
    findOneAndUpdate: async (f, u) => {
      if (!matches(f)) return null;
      Object.assign(doc, u.$set || {});
      for (const [k, v] of Object.entries(u.$inc || {})) doc[k] = (doc[k] || 0) + v;
      for (const k of Object.keys(u.$unset || {})) delete doc[k];
      return { ...doc };
    },
  };
  class HttpError extends Error { constructor(status, msg, codigo) { super(msg); this.status = status; this.codigo = codigo; } }
  const validate = (req, res, next) => {
    const data = req.body;
    if (!['monitor', 'estudiante'].includes(data.rol)) throw new HttpError(400, 'Rol inválido', 'ROL_INVALIDO');
    const correo = normalize(data.correo);
    if (!correo.valido) throw new HttpError(400, 'Correo inválido', 'CORREO_INVALIDO');
    res.locals.registro = { ...data, correo: correo.correo }; next();
  };
  const normalize = email => ({ valido: typeof email === 'string' && /^[^@\s]+@unal\.edu\.co$/i.test(email.trim()), correo: typeof email === 'string' ? email.trim().toLowerCase() : '' });
  const sandbox = { Date, Buffer, module: { exports: {} }, require: id => {
    if (id === 'node:crypto') return crypto;
    if (id === '../../models/usuario.model') return { exists: async () => existente, init: async () => {}, create: async data => { creates++; return { ...data, _id: 'u1' }; } };
    if (id === '../../models/verificacionRegistro.model') return Desafio;
    if (id === '../utils/HttpError') return HttpError;
    if (id === '../utils/validarCorreoInstitucional') return { validarCorreoInstitucional: normalize };
    if (id === '../utils/codigoVerificacion') return { generarCodigoVerificacion: () => ({ codigo: '123456', nonce: crypto.randomBytes(16).toString('hex'), huella: 'huella', venceEn: new Date(Date.now() + 600000) }), coincideCodigo: () => { codeChecks++; return coincide; } };
    if (id === './notificacion.service') return { enviarCodigoVerificacion: async () => { sends++; if (falloEnvio) throw new Error('Fallo SMTP'); } };
    if (id === './password.service') return { generarPasswordHash: async () => 'hash-password' };
    if (id === '../middlewares/validarRegistro') return validate;
    throw new Error(id);
  } };
  vm.runInNewContext(source, sandbox);
  return { ...sandbox.module.exports, state: () => ({ doc, sends, creates, codeChecks }) };
}
const correo = 'persona@unal.edu.co';
const datos = { nombre: 'Persona', correo, password: 'Password1', rol: 'estudiante' };
test('enviar y confirmar no crean usuarios; el alta final sí crea verificado', async () => {
  const f = fixture(); const sent = await f.solicitar(' PERSONA@UNAL.EDU.CO ');
  assert.equal(sent.envioAceptado, true); assert.equal(f.state().creates, 0);
  const verified = await f.confirmar({ correo, codigo: '123456' }); assert.equal(f.state().creates, 0);
  const user = await f.registrar({ ...datos, autorizacionRegistro: verified.autorizacion }); assert.equal(user.correoVerificado, true); assert.equal(f.state().creates, 1);
});
test('API de alta sin autorización y correo no autorizado se rechazan', async () => {
  const f = fixture(); await assert.rejects(f.registrar(datos), e => e.codigo === 'VERIFICACION_REGISTRO_INVALIDA');
  await assert.rejects(f.solicitar('persona@unal.edu.co.ejemplo.com'), e => e.codigo === 'CORREO_INVALIDO'); assert.equal(f.state().sends, 0);
});
test('autorización no sirve para otro correo ni se puede reutilizar', async () => {
  const f = fixture(); await f.solicitar(correo); const v = await f.confirmar({ correo, codigo: '123456' });
  await assert.rejects(f.registrar({ ...datos, correo: 'otra@unal.edu.co', autorizacionRegistro: v.autorizacion }));
  await f.registrar({ ...datos, autorizacionRegistro: v.autorizacion });
  await assert.rejects(f.registrar({ ...datos, autorizacionRegistro: v.autorizacion })); assert.equal(f.state().creates, 1);
});
test('dos altas concurrentes con la misma autorización crean como máximo una cuenta', async () => {
  const f = fixture(); await f.solicitar(correo); const v = await f.confirmar({ correo, codigo: '123456' });
  const results = await Promise.allSettled([f.registrar({ ...datos, autorizacionRegistro: v.autorizacion }), f.registrar({ ...datos, autorizacionRegistro: v.autorizacion })]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1); assert.equal(f.state().creates, 1);
});
test('no confirma envíos fallidos ni crea usuarios ante fallo SMTP', async () => {
  const f = fixture({ falloEnvio: true }); await assert.rejects(f.solicitar(correo)); await assert.rejects(f.confirmar({ correo, codigo: '123456' })); assert.equal(f.state().creates, 0);
});
test('limita intentos erróneos y rechaza código vencido', async () => {
  const f = fixture({ coincide: false }); await f.solicitar(correo);
  for (let i = 0; i < 6; i++) await assert.rejects(f.confirmar({ correo, codigo: '000000' }));
  assert.equal(f.state().codeChecks, 5);
  const other = fixture(); await other.solicitar(correo); other.state().doc.venceEn = new Date(0); await assert.rejects(other.confirmar({ correo, codigo: '123456' }));
});
test('limita reenvíos a seis por hora y permite nueva ventana', async () => {
  const f = fixture(); await f.solicitar(correo); await assert.rejects(f.solicitar(correo), e => e.status === 429);
  for (let i = 0; i < 5; i++) { f.state().doc.creadoEn = new Date(Date.now() - 61000); await f.solicitar(correo); }
  f.state().doc.creadoEn = new Date(Date.now() - 61000); await assert.rejects(f.solicitar(correo), e => e.status === 429);
  f.state().doc.ventanaEn = new Date(Date.now() - 3601000); await f.solicitar(correo); assert.equal(f.state().sends, 7);
});
test('cuentas existentes no se recrean y rol admin no se asigna públicamente', async () => {
  await assert.rejects(fixture({ existente: true }).solicitar(correo), e => e.status === 409);
  await assert.rejects(fixture().registrar({ ...datos, rol: 'admin' }), e => e.codigo === 'ROL_INVALIDO');
});
test('confirmación única y autorización vencida', async () => {
  const f = fixture(); await f.solicitar(correo); const v = await f.confirmar({ correo, codigo: '123456' });
  await assert.rejects(f.confirmar({ correo, codigo: '123456' }));
  f.state().doc.autorizacionVenceEn = new Date(0); await assert.rejects(f.registrar({ ...datos, autorizacionRegistro: v.autorizacion }));
});
