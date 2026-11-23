require('dotenv/config');

const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const Usuario = require('../models/usuario.model');
const PerfilEstudiante = require('../models/perfilEstudiante.model');
const {
  generarPasswordHash,
} = require('../src/services/password.service');

async function crearEstudiante() {
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
  await PerfilEstudiante.deleteMany({});
});

test('PUT /api/perfiles/estudiante - crea el perfil', async () => {
  await crearEstudiante();

  const cookie = await iniciarSesion(
    'sofia.martinez@urosario.edu.co'
  );

  const respuesta = await request(app)
    .put('/api/perfiles/estudiante')
    .set('Cookie', cookie)
    .send({
      carrera: 'Ingeniería de Sistemas',
      semestre: 5,
      materiasInteres: [],
      disponibilidadPreferida: 'Mañanas, Lun-Mi-Vie',
      modalidadPreferida: 'Virtual',
    });

  assert.equal(respuesta.status, 200);
  assert.equal(
    respuesta.body.mensaje,
    'Perfil de estudiante guardado correctamente'
  );
  assert.equal(
    respuesta.body.perfil.carrera,
    'Ingeniería de Sistemas'
  );
  assert.equal(respuesta.body.perfil.semestre, 5);
  assert.equal(
    respuesta.body.perfil.modalidadPreferida,
    'Virtual'
  );
});

test('PUT /api/perfiles/estudiante - actualiza el perfil existente', async () => {
  await crearEstudiante();

  const cookie = await iniciarSesion(
    'sofia.martinez@urosario.edu.co'
  );

  await request(app)
    .put('/api/perfiles/estudiante')
    .set('Cookie', cookie)
    .send({
      carrera: 'Ingeniería de Sistemas',
      semestre: 5,
      materiasInteres: [],
      disponibilidadPreferida: 'Mañanas',
      modalidadPreferida: 'Virtual',
    });

  const respuesta = await request(app)
    .put('/api/perfiles/estudiante')
    .set('Cookie', cookie)
    .send({
      carrera: 'Economía',
      semestre: 6,
      materiasInteres: [],
      disponibilidadPreferida: 'Tardes',
      modalidadPreferida: 'Presencial',
    });

  assert.equal(respuesta.status, 200);
  assert.equal(
    respuesta.body.perfil.carrera,
    'Economía'
  );
  assert.equal(respuesta.body.perfil.semestre, 6);
  assert.equal(
    respuesta.body.perfil.modalidadPreferida,
    'Presencial'
  );
});

test('GET /api/perfiles/estudiante - obtiene el perfil', async () => {
  await crearEstudiante();

  const cookie = await iniciarSesion(
    'sofia.martinez@urosario.edu.co'
  );

  await request(app)
    .put('/api/perfiles/estudiante')
    .set('Cookie', cookie)
    .send({
      carrera: 'Ingeniería de Sistemas',
      semestre: 5,
      materiasInteres: [],
      disponibilidadPreferida: 'Mañanas',
      modalidadPreferida: 'Virtual',
    });

  const respuesta = await request(app)
    .get('/api/perfiles/estudiante')
    .set('Cookie', cookie);

  assert.equal(respuesta.status, 200);
  assert.equal(
    respuesta.body.perfil.carrera,
    'Ingeniería de Sistemas'
  );
});

test('GET /api/perfiles/estudiante - rechaza si no existe perfil', async () => {
  await crearEstudiante();

  const cookie = await iniciarSesion(
    'sofia.martinez@urosario.edu.co'
  );

  const respuesta = await request(app)
    .get('/api/perfiles/estudiante')
    .set('Cookie', cookie);

  assert.equal(respuesta.status, 404);
  assert.equal(
    respuesta.body.error.codigo,
    'PERFIL_NO_ENCONTRADO'
  );
});

test('PUT /api/perfiles/estudiante - rechaza semestre inválido', async () => {
  await crearEstudiante();

  const cookie = await iniciarSesion(
    'sofia.martinez@urosario.edu.co'
  );

  const respuesta = await request(app)
    .put('/api/perfiles/estudiante')
    .set('Cookie', cookie)
    .send({
      carrera: 'Ingeniería de Sistemas',
      semestre: 20,
      materiasInteres: [],
      disponibilidadPreferida: 'Mañanas',
      modalidadPreferida: 'Virtual',
    });

  assert.equal(respuesta.status, 400);
  assert.equal(
    respuesta.body.error.codigo,
    'SEMESTRE_INVALIDO'
  );
});

test('PUT /api/perfiles/estudiante - rechaza modalidad inválida', async () => {
  await crearEstudiante();

  const cookie = await iniciarSesion(
    'sofia.martinez@urosario.edu.co'
  );

  const respuesta = await request(app)
    .put('/api/perfiles/estudiante')
    .set('Cookie', cookie)
    .send({
      carrera: 'Ingeniería de Sistemas',
      semestre: 5,
      materiasInteres: [],
      disponibilidadPreferida: 'Mañanas',
      modalidadPreferida: 'Híbrida',
    });

  assert.equal(respuesta.status, 400);
  assert.equal(
    respuesta.body.error.codigo,
    'MODALIDAD_INVALIDA'
  );
});

test('GET /api/perfiles/estudiante - rechaza usuario sin rol estudiante', async () => {
  const passwordHash = await generarPasswordHash('Password123');

  await Usuario.create({
    nombre: 'Monitor Prueba',
    correo: 'monitor@urosario.edu.co',
    passwordHash,
    roles: ['monitor'],
    correoVerificado: true,
    estadoCuenta: 'habilitada',
  });

  const cookie = await iniciarSesion(
    'monitor@urosario.edu.co'
  );

  const respuesta = await request(app)
    .get('/api/perfiles/estudiante')
    .set('Cookie', cookie);

  assert.equal(respuesta.status, 403);
  assert.equal(
    respuesta.body.error.codigo,
    'ACCESO_DENEGADO'
  );
});