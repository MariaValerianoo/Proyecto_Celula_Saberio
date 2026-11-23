require('dotenv/config');

const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const Usuario = require('../models/usuario.model');
const Materia = require('../models/materia.model');
const {
  generarPasswordHash,
} = require('../src/services/password.service');

async function crearUsuarioAdministrador() {
  const passwordHash = await generarPasswordHash('Password123');

  return Usuario.create({
    nombre: 'Admin Saberio',
    correo: 'admin@urosario.edu.co',
    passwordHash,
    roles: ['admin'],
    correoVerificado: true,
    estadoCuenta: 'habilitada',
  });
}

async function crearUsuarioEstudiante() {
  const passwordHash = await generarPasswordHash('Password123');

  return Usuario.create({
    nombre: 'Sofia Martinez',
    correo: 'sofia.martinez@urosario.edu.co',
    passwordHash,
    roles: ['estudiante'],
    correoVerificado: true,
    estadoCuenta: 'habilitada',
  });
}

async function iniciarSesion(correo) {
  const respuesta = await request(app)
    .post('/api/auth/login')
    .send({
      correo,
      contrasena: 'Password123',
    });

  return respuesta.headers['set-cookie'];
}

test.before(async () => {
  await mongoose.connect(process.env.MONGO_URI_TEST);
});

test.after(async () => {
  await mongoose.connection.close();
});

test.beforeEach(async () => {
  await Usuario.deleteMany({});
  await Materia.deleteMany({});
});

test('POST /api/materias - crea una materia como administrador', async () => {
  await crearUsuarioAdministrador();

  const cookie = await iniciarSesion(
    'admin@urosario.edu.co'
  );

  const respuesta = await request(app)
    .post('/api/materias')
    .set('Cookie', cookie)
    .send({
      nombre: 'Cálculo Diferencial',
      codigo: 'CALC-101',
      facultad: 'Matemáticas',
      creditos: 4,
    });

  assert.equal(respuesta.status, 201);
  assert.equal(
    respuesta.body.mensaje,
    'Materia creada correctamente'
  );
  assert.equal(
    respuesta.body.materia.codigo,
    'CALC-101'
  );
  assert.equal(respuesta.body.materia.activa, true);
});

test('POST /api/materias - rechaza creación sin permisos de administrador', async () => {
  await crearUsuarioEstudiante();

  const cookie = await iniciarSesion(
    'sofia.martinez@urosario.edu.co'
  );

  const respuesta = await request(app)
    .post('/api/materias')
    .set('Cookie', cookie)
    .send({
      nombre: 'Cálculo Diferencial',
      codigo: 'CALC-101',
      facultad: 'Matemáticas',
      creditos: 4,
    });

  assert.equal(respuesta.status, 403);
  assert.equal(
    respuesta.body.error.codigo,
    'ACCESO_DENEGADO'
  );
});

test('POST /api/materias - rechaza código duplicado', async () => {
  await crearUsuarioAdministrador();

  const cookie = await iniciarSesion(
    'admin@urosario.edu.co'
  );

  await Materia.create({
    nombre: 'Cálculo Diferencial',
    codigo: 'CALC-101',
    facultad: 'Matemáticas',
    creditos: 4,
  });

  const respuesta = await request(app)
    .post('/api/materias')
    .set('Cookie', cookie)
    .send({
      nombre: 'Cálculo Diferencial II',
      codigo: 'CALC-101',
      facultad: 'Matemáticas',
      creditos: 4,
    });

  assert.equal(respuesta.status, 409);
  assert.equal(
    respuesta.body.error.codigo,
    'MATERIA_DUPLICADA'
  );
});

test('GET /api/materias - lista materias para usuario autenticado', async () => {
  await crearUsuarioEstudiante();

  const cookie = await iniciarSesion(
    'sofia.martinez@urosario.edu.co'
  );

  await Materia.create({
    nombre: 'Cálculo Diferencial',
    codigo: 'CALC-101',
    facultad: 'Matemáticas',
    creditos: 4,
  });

  const respuesta = await request(app)
    .get('/api/materias')
    .set('Cookie', cookie);

  assert.equal(respuesta.status, 200);
  assert.equal(respuesta.body.materias.length, 1);
  assert.equal(
    respuesta.body.materias[0].codigo,
    'CALC-101'
  );
});

test('GET /api/materias/:id - obtiene una materia por id', async () => {
  await crearUsuarioEstudiante();

  const cookie = await iniciarSesion(
    'sofia.martinez@urosario.edu.co'
  );

  const materia = await Materia.create({
    nombre: 'Programación I',
    codigo: 'PROG-101',
    facultad: 'Ingeniería',
    creditos: 4,
  });

  const respuesta = await request(app)
    .get(`/api/materias/${materia._id}`)
    .set('Cookie', cookie);

  assert.equal(respuesta.status, 200);
  assert.equal(
    respuesta.body.materia.codigo,
    'PROG-101'
  );
});

test('PUT /api/materias/:id - actualiza una materia como administrador', async () => {
  await crearUsuarioAdministrador();

  const cookie = await iniciarSesion(
    'admin@urosario.edu.co'
  );

  const materia = await Materia.create({
    nombre: 'Cálculo Diferencial',
    codigo: 'CALC-101',
    facultad: 'Matemáticas',
    creditos: 4,
  });

  const respuesta = await request(app)
    .put(`/api/materias/${materia._id}`)
    .set('Cookie', cookie)
    .send({
      nombre: 'Cálculo Diferencial II',
    });

  assert.equal(respuesta.status, 200);
  assert.equal(
    respuesta.body.materia.nombre,
    'Cálculo Diferencial II'
  );
});

test('PATCH /api/materias/:id/estado - desactiva una materia', async () => {
  await crearUsuarioAdministrador();

  const cookie = await iniciarSesion(
    'admin@urosario.edu.co'
  );

  const materia = await Materia.create({
    nombre: 'Microeconomía',
    codigo: 'MICR-201',
    facultad: 'Economía',
    creditos: 3,
  });

  const respuesta = await request(app)
    .patch(`/api/materias/${materia._id}/estado`)
    .set('Cookie', cookie)
    .send({
      activa: false,
    });

  assert.equal(respuesta.status, 200);
  assert.equal(respuesta.body.materia.activa, false);
  assert.equal(
    respuesta.body.mensaje,
    'Materia desactivada correctamente'
  );
});

test('PATCH /api/materias/:id/estado - rechaza estado inválido', async () => {
  await crearUsuarioAdministrador();

  const cookie = await iniciarSesion(
    'admin@urosario.edu.co'
  );

  const materia = await Materia.create({
    nombre: 'Microeconomía',
    codigo: 'MICR-201',
    facultad: 'Economía',
    creditos: 3,
  });

  const respuesta = await request(app)
    .patch(`/api/materias/${materia._id}/estado`)
    .set('Cookie', cookie)
    .send({
      activa: 'no-es-booleano',
    });

  assert.equal(respuesta.status, 400);
  assert.equal(
    respuesta.body.error.codigo,
    'FORMATO_INVALIDO'
  );
});