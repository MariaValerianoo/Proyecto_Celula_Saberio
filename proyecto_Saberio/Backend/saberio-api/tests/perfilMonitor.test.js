require('dotenv/config');

const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const Usuario = require('../models/usuario.model');
const PerfilMonitor = require('../models/perfilMonitor.model');
const Materia = require('../models/materia.model');
const {
  generarPasswordHash,
} = require('../src/services/password.service');

async function crearMonitor() {
  const passwordHash = await generarPasswordHash('Password123');

  return Usuario.create({
    nombre: 'Monitor Prueba',
    correo: 'monitor@urosario.edu.co',
    passwordHash,
    roles: ['monitor'],
    correoVerificado: true,
    estadoCuenta: 'habilitada',
  });
}

async function crearEstudiante() {
  const passwordHash = await generarPasswordHash('Password123');

  return Usuario.create({
    nombre: 'Estudiante Prueba',
    correo: 'estudiante@urosario.edu.co',
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

async function crearMateria() {
  return Materia.create({
    nombre: 'Cálculo Diferencial',
    codigo: 'CALC-101',
    facultad: 'Ingeniería',
    creditos: 4,
  });
}

function datosPerfilValidos(idMateria) {
  return {
    biografia:
      'Soy monitor de matemáticas con experiencia apoyando a estudiantes universitarios.',
    experienciaAcademica:
      'Estudiante de último semestre de Matemáticas con promedio destacado.',
    enfoqueEnsenanza:
      'Explico con ejemplos paso a paso y refuerzo los conceptos con ejercicios.',
    materiasOfrecidas: [idMateria],
    tarifaPorHora: 25000,
    modalidades: ['Virtual'],
    disponibilidadHoraria:
      'Lunes a viernes de 2:00 p. m. a 6:00 p. m.',
  };
}

test.before(async () => {
  await mongoose.connect(process.env.MONGO_URI_TEST);
});

test.after(async () => {
  await mongoose.connection.close();
});

test.beforeEach(async () => {
  await Usuario.deleteMany({});
  await PerfilMonitor.deleteMany({});
  await Materia.deleteMany({});
});

test('PUT /api/perfiles/monitor - crea el perfil', async () => {
  await crearMonitor();
  const materia = await crearMateria();

  const cookie = await iniciarSesion(
    'monitor@urosario.edu.co'
  );

  const respuesta = await request(app)
    .put('/api/perfiles/monitor')
    .set('Cookie', cookie)
    .send(datosPerfilValidos(materia._id.toString()));

  assert.equal(respuesta.status, 200);
  assert.equal(
    respuesta.body.mensaje,
    'Perfil de monitor guardado correctamente'
  );
  assert.equal(
    respuesta.body.perfil.tarifaPorHora,
    25000
  );
  assert.equal(
    respuesta.body.perfil.estadoPerfil,
    'Pendiente'
  );
});

test('PUT /api/perfiles/monitor - actualiza el perfil existente', async () => {
  await crearMonitor();
  const materia = await crearMateria();

  const cookie = await iniciarSesion(
    'monitor@urosario.edu.co'
  );

  await request(app)
    .put('/api/perfiles/monitor')
    .set('Cookie', cookie)
    .send(datosPerfilValidos(materia._id.toString()));

  const respuesta = await request(app)
    .put('/api/perfiles/monitor')
    .set('Cookie', cookie)
    .send({
      ...datosPerfilValidos(materia._id.toString()),
      tarifaPorHora: 30000,
      modalidades: ['Presencial', 'Virtual'],
    });

  assert.equal(respuesta.status, 200);
  assert.equal(
    respuesta.body.perfil.tarifaPorHora,
    30000
  );
  assert.deepEqual(
    respuesta.body.perfil.modalidades,
    ['Presencial', 'Virtual']
  );
});

test('GET /api/perfiles/monitor - obtiene el perfil', async () => {
  await crearMonitor();
  const materia = await crearMateria();

  const cookie = await iniciarSesion(
    'monitor@urosario.edu.co'
  );

  await request(app)
    .put('/api/perfiles/monitor')
    .set('Cookie', cookie)
    .send(datosPerfilValidos(materia._id.toString()));

  const respuesta = await request(app)
    .get('/api/perfiles/monitor')
    .set('Cookie', cookie);

  assert.equal(respuesta.status, 200);
  assert.equal(
    respuesta.body.perfil.tarifaPorHora,
    25000
  );
});

test('GET /api/perfiles/monitor - rechaza si no existe perfil', async () => {
  await crearMonitor();

  const cookie = await iniciarSesion(
    'monitor@urosario.edu.co'
  );

  const respuesta = await request(app)
    .get('/api/perfiles/monitor')
    .set('Cookie', cookie);

  assert.equal(respuesta.status, 404);
  assert.equal(
    respuesta.body.error.codigo,
    'PERFIL_NO_ENCONTRADO'
  );
});

test('PUT /api/perfiles/monitor - rechaza biografía corta', async () => {
  await crearMonitor();
  const materia = await crearMateria();

  const cookie = await iniciarSesion(
    'monitor@urosario.edu.co'
  );

  const respuesta = await request(app)
    .put('/api/perfiles/monitor')
    .set('Cookie', cookie)
    .send({
      ...datosPerfilValidos(materia._id.toString()),
      biografia: 'Corta',
    });

  assert.equal(respuesta.status, 400);
  assert.equal(
    respuesta.body.error.codigo,
    'BIOGRAFIA_INVALIDA'
  );
});

test('PUT /api/perfiles/monitor - rechaza tarifa negativa', async () => {
  await crearMonitor();
  const materia = await crearMateria();

  const cookie = await iniciarSesion(
    'monitor@urosario.edu.co'
  );

  const respuesta = await request(app)
    .put('/api/perfiles/monitor')
    .set('Cookie', cookie)
    .send({
      ...datosPerfilValidos(materia._id.toString()),
      tarifaPorHora: -1,
    });

  assert.equal(respuesta.status, 400);
  assert.equal(
    respuesta.body.error.codigo,
    'TARIFA_INVALIDA'
  );
});

test('PUT /api/perfiles/monitor - rechaza modalidad inválida', async () => {
  await crearMonitor();
  const materia = await crearMateria();

  const cookie = await iniciarSesion(
    'monitor@urosario.edu.co'
  );

  const respuesta = await request(app)
    .put('/api/perfiles/monitor')
    .set('Cookie', cookie)
    .send({
      ...datosPerfilValidos(materia._id.toString()),
      modalidades: ['Híbrida'],
    });

  assert.equal(respuesta.status, 400);
  assert.equal(
    respuesta.body.error.codigo,
    'MODALIDADES_INVALIDAS'
  );
});

test('GET /api/perfiles/monitor - rechaza usuario sin rol monitor', async () => {
  await crearEstudiante();

  const cookie = await iniciarSesion(
    'estudiante@urosario.edu.co'
  );

  const respuesta = await request(app)
    .get('/api/perfiles/monitor')
    .set('Cookie', cookie);

  assert.equal(respuesta.status, 403);
  assert.equal(
    respuesta.body.error.codigo,
    'ACCESO_DENEGADO'
  );
});
test('PUT /api/perfiles/monitor - crea el perfil sin materias acreditadas', async () => {
  const monitor = await crearMonitor();
  const materia = await crearMateria();

  const cookie = await iniciarSesion(
    'monitor@urosario.edu.co'
  );

  const respuesta = await request(app)
    .put('/api/perfiles/monitor')
    .set('Cookie', cookie)
    .send(
      datosPerfilValidos(materia._id.toString())
    );

  assert.equal(respuesta.status, 200);

  const perfil = await PerfilMonitor.findOne({
    usuario: monitor._id,
  });

  assert.ok(perfil);
  assert.deepEqual(
    perfil.materiasAcreditadas.map(String),
    []
  );
  assert.equal(perfil.estadoPerfil, 'Pendiente');
});

test('PUT /api/perfiles/monitor - impide asignarse materias acreditadas', async () => {
  const monitor = await crearMonitor();
  const materia = await crearMateria();

  await PerfilMonitor.create({
    usuario: monitor._id,
    ...datosPerfilValidos(materia._id.toString()),
  });

  const cookie = await iniciarSesion(
    'monitor@urosario.edu.co'
  );

  const respuesta = await request(app)
    .put('/api/perfiles/monitor')
    .set('Cookie', cookie)
    .send({
      ...datosPerfilValidos(materia._id.toString()),
      materiasAcreditadas: [
        materia._id.toString(),
      ],
    });

  assert.equal(respuesta.status, 400);
  assert.equal(
    respuesta.body.error.codigo,
    'CAMPOS_NO_PERMITIDOS'
  );

  const perfil = await PerfilMonitor.findOne({
    usuario: monitor._id,
  });

  assert.deepEqual(
    perfil.materiasAcreditadas.map(String),
    []
  );
});

test('PUT /api/perfiles/monitor - impide aprobar su propio perfil', async () => {
  const monitor = await crearMonitor();
  const materia = await crearMateria();

  await PerfilMonitor.create({
    usuario: monitor._id,
    ...datosPerfilValidos(materia._id.toString()),
  });

  const cookie = await iniciarSesion(
    'monitor@urosario.edu.co'
  );

  const respuesta = await request(app)
    .put('/api/perfiles/monitor')
    .set('Cookie', cookie)
    .send({
      ...datosPerfilValidos(materia._id.toString()),
      estadoPerfil: 'Aprobado',
    });

  assert.equal(respuesta.status, 400);
  assert.equal(
    respuesta.body.error.codigo,
    'CAMPOS_NO_PERMITIDOS'
  );

  const perfil = await PerfilMonitor.findOne({
    usuario: monitor._id,
  });

  assert.equal(perfil.estadoPerfil, 'Pendiente');
});

test('PUT /api/perfiles/monitor - conserva la acreditación al editar datos del perfil', async () => {
  const monitor = await crearMonitor();
  const materia = await crearMateria();

  await PerfilMonitor.create({
    usuario: monitor._id,
    ...datosPerfilValidos(materia._id.toString()),
    materiasAcreditadas: [materia._id],
    estadoPerfil: 'Aprobado',
  });

  const cookie = await iniciarSesion(
    'monitor@urosario.edu.co'
  );

  const respuesta = await request(app)
    .put('/api/perfiles/monitor')
    .set('Cookie', cookie)
    .send({
      ...datosPerfilValidos(materia._id.toString()),
      tarifaPorHora: 30000,
    });

  assert.equal(respuesta.status, 200);

  const perfil = await PerfilMonitor.findOne({
    usuario: monitor._id,
  });

  assert.equal(perfil.tarifaPorHora, 30000);
  assert.equal(perfil.estadoPerfil, 'Aprobado');
  assert.deepEqual(
    perfil.materiasAcreditadas.map(String),
    [materia._id.toString()]
  );
});