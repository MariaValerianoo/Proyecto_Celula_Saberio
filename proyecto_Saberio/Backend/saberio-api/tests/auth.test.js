require('dotenv/config');

const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const Usuario = require('../models/usuario.model');
const {
  generarPasswordHash,
} = require('../src/services/password.service');

test.before(async () => {
  await mongoose.connect(process.env.MONGO_URI_TEST);
});

test.after(async () => {
  await mongoose.connection.close();
});

test.beforeEach(async () => {
  await Usuario.deleteMany({});
});

test('POST /api/auth/login - inicia sesión con credenciales válidas', async () => {
  const passwordHash = await generarPasswordHash('Password123');

  await Usuario.create({
    nombre: 'Sofia Martinez',
    correo: 'sofia.martinez@urosario.edu.co',
    passwordHash,
    roles: ['estudiante'],
    correoVerificado: true,
    estadoCuenta: 'habilitada',
  });

  const respuesta = await request(app)
    .post('/api/auth/login')
    .send({
      correo: 'sofia.martinez@urosario.edu.co',
      contrasena: 'Password123',
    });

  assert.equal(respuesta.status, 200);
  assert.equal(
    respuesta.body.mensaje,
    'Sesión iniciada correctamente'
  );
  assert.equal(
    respuesta.body.usuario.correo,
    'sofia.martinez@urosario.edu.co'
  );
  assert.ok(respuesta.headers['set-cookie']);
});

test('POST /api/auth/login - rechaza credenciales inválidas', async () => {
  const passwordHash = await generarPasswordHash('Password123');

  await Usuario.create({
    nombre: 'Sofia Martinez',
    correo: 'sofia.martinez@urosario.edu.co',
    passwordHash,
    roles: ['estudiante'],
    correoVerificado: true,
    estadoCuenta: 'habilitada',
  });

  const respuesta = await request(app)
    .post('/api/auth/login')
    .send({
      correo: 'sofia.martinez@urosario.edu.co',
      contrasena: 'Incorrecta123',
    });

  assert.equal(respuesta.status, 401);
  assert.equal(
    respuesta.body.error.codigo,
    'CREDENCIALES_INVALIDAS'
  );
});

test('POST /api/auth/login - rechaza correo no verificado', async () => {
  const passwordHash = await generarPasswordHash('Password123');

  await Usuario.create({
    nombre: 'Sofia Martinez',
    correo: 'sofia.martinez@urosario.edu.co',
    passwordHash,
    roles: ['estudiante'],
    correoVerificado: false,
    estadoCuenta: 'habilitada',
  });

  const respuesta = await request(app)
    .post('/api/auth/login')
    .send({
      correo: 'sofia.martinez@urosario.edu.co',
      contrasena: 'Password123',
    });

  assert.equal(respuesta.status, 403);
  assert.equal(
    respuesta.body.error.codigo,
    'CORREO_NO_VERIFICADO'
  );
});

test('GET /api/auth/perfil - devuelve el perfil autenticado', async () => {
  const passwordHash = await generarPasswordHash('Password123');

  const usuario = await Usuario.create({
    nombre: 'Sofia Martinez',
    correo: 'sofia.martinez@urosario.edu.co',
    passwordHash,
    roles: ['estudiante'],
    correoVerificado: true,
    estadoCuenta: 'habilitada',
  });

  const login = await request(app)
    .post('/api/auth/login')
    .send({
      correo: 'sofia.martinez@urosario.edu.co',
      contrasena: 'Password123',
    });

  const cookie = login.headers['set-cookie'];

  const respuesta = await request(app)
    .get('/api/auth/perfil')
    .set('Cookie', cookie);

  assert.equal(respuesta.status, 200);
  assert.equal(
    respuesta.body.usuario.id,
    usuario._id.toString()
  );
  assert.equal(
    respuesta.body.usuario.correo,
    'sofia.martinez@urosario.edu.co'
  );
});

test('GET /api/auth/perfil - rechaza acceso sin sesión', async () => {
  const respuesta = await request(app).get(
    '/api/auth/perfil'
  );

  assert.equal(respuesta.status, 401);
  assert.equal(
    respuesta.body.error.codigo,
    'SESION_REQUERIDA'
  );
});

test('POST /api/auth/logout - cierra sesión', async () => {
  const respuesta = await request(app).post(
    '/api/auth/logout'
  );

  assert.equal(respuesta.status, 200);
  assert.equal(
    respuesta.body.mensaje,
    'Sesión cerrada correctamente'
  );
});

test('POST /api/auth/recuperar-contrasena - solicita recuperación', async () => {
  const respuesta = await request(app)
    .post('/api/auth/recuperar-contrasena')
    .send({
      correo: 'sofia.martinez@urosario.edu.co',
    });

  assert.equal(respuesta.status, 200);
  assert.ok(respuesta.body.mensaje);
});

test('POST /api/auth/restablecer-contrasena - rechaza código inválido', async () => {
  const respuesta = await request(app)
    .post('/api/auth/restablecer-contrasena')
    .send({
      correo: 'sofia.martinez@urosario.edu.co',
      codigo: '000000',
      nuevaContrasena: 'Password123',
      confirmacionContrasena: 'Password123',
    });

  assert.equal(respuesta.status, 400);
  assert.equal(
    respuesta.body.error.codigo,
    'CODIGO_RECUPERACION_INVALIDO'
  );
});