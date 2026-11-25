const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
function cargar(file, mocks) {
  const sandbox = { process, module: { exports: {} }, require: id => id in mocks ? mocks[id] : require(id) };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), sandbox);
  return sandbox.module.exports;
}
function fixture() {
  const rows = new Map();
  const jwt = { EXPIRACION_SEGUNDOS: 28800, verificarTokenSesion: token => { if (token === 'invalido') throw Object.assign(new Error('Inválido'), { status: 401 }); return { id: 'u1' }; } };
  const service = cargar('src/services/sesionSegura.service.js', {
    '../../models/sesionRevocada.model': { updateOne: async (f, u) => rows.set(f._id, u.$setOnInsert), exists: async f => rows.has(f._id) },
    '../utils/jwt': jwt,
  });
  return { service, rows, jwt };
}
test('revoca la sesión exacta sin guardar el token y sin bloquear otra sesión', async () => {
  const { service, rows } = fixture();
  assert.equal(await service.estaRevocada('token-1'), false);
  await service.revocar('token-1');
  assert.equal(await service.estaRevocada('token-1'), true);
  assert.equal(await service.estaRevocada('token-2'), false);
  assert.match([...rows.keys()][0], /^[a-f0-9]{64}$/);
  assert.equal(JSON.stringify([...rows]).includes('token-1'), false);
  assert.ok([...rows.values()][0].venceEn.getTime() > Date.now());
});
test('el cierre sin cookie o con token inválido no crea revocaciones', async () => {
  const { service, rows } = fixture();
  await service.revocar(undefined); await service.revocar('invalido');
  assert.equal(rows.size, 0);
});
test('un fallo de persistencia impide confirmar la revocación', async () => {
  const service = cargar('src/services/sesionSegura.service.js', {
    '../../models/sesionRevocada.model': { updateOne: async () => { throw new Error('DB no disponible'); } },
    '../utils/jwt': { EXPIRACION_SEGUNDOS: 28800, verificarTokenSesion: () => ({ id: 'u1' }) },
  });
  await assert.rejects(service.revocar('token'), /DB no disponible/);
});
test('autenticar rechaza el token revocado antes de consultar el usuario', async () => {
  let consulted = false;
  const middleware = cargar('src/middlewares/autenticar.js', {
    '../../models/usuario.model': { findById: () => { consulted = true; } },
    '../utils/HttpError': class extends Error { constructor(status, mensaje, codigo) { super(mensaje); this.status = status; this.codigo = codigo; } },
    '../utils/cookies': { NOMBRE_COOKIE_SESION: 'saberio_sesion' },
    '../utils/jwt': { verificarTokenSesion: () => ({ id: 'u1' }) },
    '../services/sesionSegura.service': { estaRevocada: async () => true },
  });
  let error;
  await middleware({ cookies: { saberio_sesion: 'revocado' } }, { set() {} }, err => { error = err; });
  assert.equal(error.status, 401); assert.equal(error.codigo, 'SESION_REVOCADA'); assert.equal(consulted, false);
});
test('cada nuevo inicio de sesión genera un identificador distinto', () => {
  const previous = process.env.JWT_SECRETO;
  process.env.JWT_SECRETO = 'x'.repeat(64);
  try {
    const helper = cargar('src/utils/jwt.js', {
      jsonwebtoken: { sign: (payload, secret, options) => options.jwtid },
      '../utils/HttpError': Error,
      './HttpError': Error,
      process,
    });
    const user = { id: 'u1', correo: 'a@urosario.edu.co', roles: ['estudiante'] };
    assert.notEqual(helper.generarTokenSesion(user), helper.generarTokenSesion(user));
  } finally { if (previous === undefined) delete process.env.JWT_SECRETO; else process.env.JWT_SECRETO = previous; }
});
