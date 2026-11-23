require('dotenv/config');

const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const Usuario = require('../models/usuario.model');
const Materia = require('../models/materia.model');
const SolicitudTutoria = require('../models/solicitudTutoria.model');
const SesionTutoria = require('../models/sesionTutoria.model');
const Evaluacion = require('../models/evaluacion.model');
const {
  generarPasswordHash,
} = require('../src/services/password.service');

async function crearUsuario(datos) {
  const passwordHash = await generarPasswordHash('Password123');

  return Usuario.create({
    ...datos,
    passwordHash,
    correoVerificado: true,
    estadoCuenta: 'habilitada',
  });
}

async function crearMateria() {
  return Materia.create({
    nombre: 'Cálculo Diferencial',
    codigo: 'CALC-101',
    facultad: 'Ingeniería',
    creditos: 4,
  });
}

async function crearSesionCompletada(estudiante, monitor, materia) {
  const solicitud = await SolicitudTutoria.create({
    estudiante: estudiante._id,
    monitor: monitor._id,
    materia: materia._id,
    tema: 'Derivadas y límites',
    descripcion:
      'Necesito ayuda para entender límites y derivadas antes del parcial.',
    modalidad: 'Virtual',
    fechaPreferida: '2026-12-01',
    horaPreferida: '15:00',
    duracionEstimadaHoras: 2,
    estado: 'Aceptada',
  });

  return SesionTutoria.create({
    solicitud: solicitud._id,
    estudiante: estudiante._id,
    monitor: monitor._id,
    materia: materia._id,
    tema: 'Derivadas y límites',
    modalidad: 'Virtual',
    fecha: '2026-12-01',
    hora: '15:00',
    duracionHoras: 2,
    lugarOEnlace: 'https://meet.google.com/saberio',
    notas: 'Repasamos límites y derivadas.',
    estado: 'Completada',
    fechaFinalizacion: new Date(),
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
  await SolicitudTutoria.deleteMany({});
  await SesionTutoria.deleteMany({});
  await Evaluacion.deleteMany({});
});

test('POST /api/evaluaciones - crea una evaluación', async () => {
  const estudiante = await crearUsuario({
    nombre: 'Sofia Martinez',
    correo: 'sofia.martinez@urosario.edu.co',
    roles: ['estudiante'],
  });

  const monitor = await crearUsuario({
    nombre: 'Monitor Prueba',
    correo: 'monitor@urosario.edu.co',
    roles: ['monitor'],
  });

  const materia = await crearMateria();

  const sesion = await crearSesionCompletada(
    estudiante,
    monitor,
    materia
  );

  const cookie = await iniciarSesion(
    'sofia.martinez@urosario.edu.co'
  );

  const respuesta = await request(app)
    .post('/api/evaluaciones')
    .set('Cookie', cookie)
    .send({
      sesion: sesion._id.toString(),
      calificacion: 5,
      comentario:
        'Excelente explicación, entendí muy bien el tema.',
    });

  assert.equal(respuesta.status, 201);
  assert.equal(
    respuesta.body.mensaje,
    'Evaluación registrada correctamente'
  );
  assert.equal(
    respuesta.body.evaluacion.calificacion,
    5
  );
});

test('POST /api/evaluaciones - rechaza usuario sin rol estudiante', async () => {
  const estudiante = await crearUsuario({
    nombre: 'Sofia Martinez',
    correo: 'sofia.martinez@urosario.edu.co',
    roles: ['estudiante'],
  });

  const monitor = await crearUsuario({
    nombre: 'Monitor Prueba',
    correo: 'monitor@urosario.edu.co',
    roles: ['monitor'],
  });

  const materia = await crearMateria();

  const sesion = await crearSesionCompletada(
    estudiante,
    monitor,
    materia
  );

  const cookie = await iniciarSesion(
    'monitor@urosario.edu.co'
  );

  const respuesta = await request(app)
    .post('/api/evaluaciones')
    .set('Cookie', cookie)
    .send({
      sesion: sesion._id.toString(),
      calificacion: 5,
    });

  assert.equal(respuesta.status, 403);
  assert.equal(
    respuesta.body.error.codigo,
    'ACCESO_DENEGADO'
  );
});

test('POST /api/evaluaciones - rechaza calificación inválida', async () => {
  const estudiante = await crearUsuario({
    nombre: 'Sofia Martinez',
    correo: 'sofia.martinez@urosario.edu.co',
    roles: ['estudiante'],
  });

  const monitor = await crearUsuario({
    nombre: 'Monitor Prueba',
    correo: 'monitor@urosario.edu.co',
    roles: ['monitor'],
  });

  const materia = await crearMateria();

  const sesion = await crearSesionCompletada(
    estudiante,
    monitor,
    materia
  );

  const cookie = await iniciarSesion(
    'sofia.martinez@urosario.edu.co'
  );

  const respuesta = await request(app)
    .post('/api/evaluaciones')
    .set('Cookie', cookie)
    .send({
      sesion: sesion._id.toString(),
      calificacion: 6,
    });

  assert.equal(respuesta.status, 400);
  assert.equal(
    respuesta.body.error.codigo,
    'CALIFICACION_INVALIDA'
  );
});

test('POST /api/evaluaciones - rechaza sesión inexistente', async () => {
  await crearUsuario({
    nombre: 'Sofia Martinez',
    correo: 'sofia.martinez@urosario.edu.co',
    roles: ['estudiante'],
  });

  const cookie = await iniciarSesion(
    'sofia.martinez@urosario.edu.co'
  );

  const respuesta = await request(app)
    .post('/api/evaluaciones')
    .set('Cookie', cookie)
    .send({
      sesion: new mongoose.Types.ObjectId().toString(),
      calificacion: 5,
    });

  assert.equal(respuesta.status, 404);
  assert.equal(
    respuesta.body.error.codigo,
    'SESION_NO_ENCONTRADA'
  );
});

test('POST /api/evaluaciones - rechaza sesión no completada', async () => {
  const estudiante = await crearUsuario({
    nombre: 'Sofia Martinez',
    correo: 'sofia.martinez@urosario.edu.co',
    roles: ['estudiante'],
  });

  const monitor = await crearUsuario({
    nombre: 'Monitor Prueba',
    correo: 'monitor@urosario.edu.co',
    roles: ['monitor'],
  });

  const materia = await crearMateria();

  const solicitud = await SolicitudTutoria.create({
    estudiante: estudiante._id,
    monitor: monitor._id,
    materia: materia._id,
    tema: 'Derivadas y límites',
    descripcion:
      'Necesito ayuda para entender límites y derivadas antes del parcial.',
    modalidad: 'Virtual',
    fechaPreferida: '2026-12-01',
    horaPreferida: '15:00',
    duracionEstimadaHoras: 2,
    estado: 'Aceptada',
  });

  const sesion = await SesionTutoria.create({
    solicitud: solicitud._id,
    estudiante: estudiante._id,
    monitor: monitor._id,
    materia: materia._id,
    tema: 'Derivadas y límites',
    modalidad: 'Virtual',
    fecha: '2026-12-01',
    hora: '15:00',
    duracionHoras: 2,
    estado: 'Programada',
  });

  const cookie = await iniciarSesion(
    'sofia.martinez@urosario.edu.co'
  );

  const respuesta = await request(app)
    .post('/api/evaluaciones')
    .set('Cookie', cookie)
    .send({
      sesion: sesion._id.toString(),
      calificacion: 5,
    });

  assert.equal(respuesta.status, 400);
  assert.equal(
    respuesta.body.error.codigo,
    'SESION_NO_COMPLETADA'
  );
});

test('POST /api/evaluaciones - rechaza evaluación duplicada', async () => {
  const estudiante = await crearUsuario({
    nombre: 'Sofia Martinez',
    correo: 'sofia.martinez@urosario.edu.co',
    roles: ['estudiante'],
  });

  const monitor = await crearUsuario({
    nombre: 'Monitor Prueba',
    correo: 'monitor@urosario.edu.co',
    roles: ['monitor'],
  });

  const materia = await crearMateria();

  const sesion = await crearSesionCompletada(
    estudiante,
    monitor,
    materia
  );

  const cookie = await iniciarSesion(
    'sofia.martinez@urosario.edu.co'
  );

  await request(app)
    .post('/api/evaluaciones')
    .set('Cookie', cookie)
    .send({
      sesion: sesion._id.toString(),
      calificacion: 5,
    });

  const respuesta = await request(app)
    .post('/api/evaluaciones')
    .set('Cookie', cookie)
    .send({
      sesion: sesion._id.toString(),
      calificacion: 4,
    });

  assert.equal(respuesta.status, 400);
  assert.equal(
    respuesta.body.error.codigo,
    'EVALUACION_EXISTENTE'
  );
});

test('GET /api/evaluaciones/monitor/:id - lista evaluaciones del monitor', async () => {
  const estudiante = await crearUsuario({
    nombre: 'Sofia Martinez',
    correo: 'sofia.martinez@urosario.edu.co',
    roles: ['estudiante'],
  });

  const monitor = await crearUsuario({
    nombre: 'Monitor Prueba',
    correo: 'monitor@urosario.edu.co',
    roles: ['monitor'],
  });

  const materia = await crearMateria();

  const sesion = await crearSesionCompletada(
    estudiante,
    monitor,
    materia
  );

  const cookie = await iniciarSesion(
    'sofia.martinez@urosario.edu.co'
  );

  await request(app)
    .post('/api/evaluaciones')
    .set('Cookie', cookie)
    .send({
      sesion: sesion._id.toString(),
      calificacion: 5,
    });

  const respuesta = await request(app)
    .get(`/api/evaluaciones/monitor/${monitor._id}`)
    .set('Cookie', cookie);

  assert.equal(respuesta.status, 200);
  assert.equal(
    respuesta.body.evaluaciones.length,
    1
  );
  assert.equal(
    respuesta.body.evaluaciones[0].calificacion,
    5
  );
});

test('GET /api/evaluaciones/monitor/:id/promedio - calcula el promedio', async () => {
  const estudiante = await crearUsuario({
    nombre: 'Sofia Martinez',
    correo: 'sofia.martinez@urosario.edu.co',
    roles: ['estudiante'],
  });

  const monitor = await crearUsuario({
    nombre: 'Monitor Prueba',
    correo: 'monitor@urosario.edu.co',
    roles: ['monitor'],
  });

  const materia = await crearMateria();

  const sesion = await crearSesionCompletada(
    estudiante,
    monitor,
    materia
  );

  const cookie = await iniciarSesion(
    'sofia.martinez@urosario.edu.co'
  );

  await request(app)
    .post('/api/evaluaciones')
    .set('Cookie', cookie)
    .send({
      sesion: sesion._id.toString(),
      calificacion: 5,
    });

  const respuesta = await request(app)
    .get(
      `/api/evaluaciones/monitor/${monitor._id}/promedio`
    )
    .set('Cookie', cookie);

  assert.equal(respuesta.status, 200);
  assert.equal(
    respuesta.body.evaluacion.promedio,
    5
  );
  assert.equal(
    respuesta.body.evaluacion.totalEvaluaciones,
    1
  );
});
test('POST /api/evaluaciones - rechaza estudiante ajeno a la sesión', async () => {
  const estudiante = await crearUsuario({
    nombre: 'Sofia Martinez',
    correo: 'sofia.martinez@urosario.edu.co',
    roles: ['estudiante'],
  });

  const otroEstudiante = await crearUsuario({
    nombre: 'Otro Estudiante',
    correo: 'otro.estudiante@urosario.edu.co',
    roles: ['estudiante'],
  });

  const monitor = await crearUsuario({
    nombre: 'Monitor Prueba',
    correo: 'monitor@urosario.edu.co',
    roles: ['monitor'],
  });

  const materia = await crearMateria();

  const sesion = await crearSesionCompletada(
    estudiante,
    monitor,
    materia
  );

  const cookieOtroEstudiante =
    await iniciarSesion(
      'otro.estudiante@urosario.edu.co'
    );

  const respuesta = await request(app)
    .post('/api/evaluaciones')
    .set('Cookie', cookieOtroEstudiante)
    .send({
      sesion: sesion._id.toString(),
      calificacion: 5,
      comentario:
        'Intento de evaluar una sesión ajena.',
    });

  assert.equal(respuesta.status, 403);
  assert.equal(
    respuesta.body.error.codigo,
    'ACCESO_DENEGADO'
  );

  const totalEvaluaciones =
    await Evaluacion.countDocuments();

  assert.equal(totalEvaluaciones, 0);
});
test('GET /api/evaluaciones/monitor/:id/promedio - devuelve promedio vacío sin evaluaciones', async () => {
  const monitor = await crearUsuario({
    nombre: 'Monitor Sin Evaluaciones',
    correo:
      'monitor.sin.evaluaciones@urosario.edu.co',
    roles: ['monitor'],
  });

  const cookie = await iniciarSesion(
    'monitor.sin.evaluaciones@urosario.edu.co'
  );

  const respuesta = await request(app)
    .get(
      `/api/evaluaciones/monitor/${monitor._id}/promedio`
    )
    .set('Cookie', cookie);

  assert.equal(respuesta.status, 200);
  assert.equal(
    respuesta.body.evaluacion.promedio,
    null
  );
  assert.equal(
    respuesta.body.evaluacion
      .totalEvaluaciones,
    0
  );
});