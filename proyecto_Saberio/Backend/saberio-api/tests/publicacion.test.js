require('dotenv/config');

const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const Usuario = require('../models/usuario.model');
const Materia = require('../models/materia.model');
const PerfilMonitor = require('../models/perfilMonitor.model');
const Publicacion = require('../models/publicacion.model');
const {
  generarPasswordHash,
} = require('../src/services/password.service');

async function crearMonitorAprobado() {
  const passwordHash = await generarPasswordHash('Password123');

  const monitor = await Usuario.create({
    nombre: 'Monitor Prueba',
    correo: 'monitor@urosario.edu.co',
    passwordHash,
    roles: ['monitor'],
    correoVerificado: true,
    estadoCuenta: 'habilitada',
  });

  const materia = await Materia.create({
    nombre: 'Cálculo Diferencial',
    codigo: 'CALC-101',
    facultad: 'Ingeniería',
    creditos: 4,
  });

  await PerfilMonitor.create({
    usuario: monitor._id,
    biografia:
      'Soy monitor de matemáticas con experiencia apoyando a estudiantes universitarios.',
    experienciaAcademica:
      'Estudiante de último semestre de Matemáticas con promedio destacado.',
    enfoqueEnsenanza:
      'Explico con ejemplos paso a paso y refuerzo los conceptos con ejercicios.',
    materiasOfrecidas: [materia._id],
    materiasAcreditadas: [materia._id],
    tarifaPorHora: 25000,
    modalidades: ['Virtual'],
    disponibilidadHoraria:
      'Lunes a viernes de 2:00 p. m. a 6:00 p. m.',
    estadoPerfil: 'Aprobado',
  });

  return {
    monitor,
    materia,
  };
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

function datosPublicacionValidos(idMateria) {
  return {
    materia: idMateria,
    descripcion:
      'Apoyo en derivadas, integrales y preparación de parciales con ejercicios.',
    modalidad: 'Virtual',
    tarifaPorHora: 25000,
    duracionMinutos: 90,
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
  await Materia.deleteMany({});
  await PerfilMonitor.deleteMany({});
  await Publicacion.deleteMany({});
});

test('POST /api/publicaciones - crea una publicación', async () => {
  const { materia } =
    await crearMonitorAprobado();

  const cookie = await iniciarSesion(
    'monitor@urosario.edu.co'
  );

  const respuesta = await request(app)
    .post('/api/publicaciones')
    .set('Cookie', cookie)
    .send(
      datosPublicacionValidos(
        materia._id.toString()
      )
    );

  assert.equal(respuesta.status, 201);
  assert.equal(
    respuesta.body.mensaje,
    'Publicación creada correctamente'
  );
  assert.equal(
    respuesta.body.publicacion.activa,
    true
  );
});

test('POST /api/publicaciones - rechaza usuario sin rol monitor', async () => {
  const passwordHash = await generarPasswordHash('Password123');

  await Usuario.create({
    nombre: 'Estudiante Prueba',
    correo: 'estudiante@urosario.edu.co',
    passwordHash,
    roles: ['estudiante'],
    correoVerificado: true,
    estadoCuenta: 'habilitada',
  });

  const cookie = await iniciarSesion(
    'estudiante@urosario.edu.co'
  );

  const respuesta = await request(app)
    .post('/api/publicaciones')
    .set('Cookie', cookie)
    .send(
      datosPublicacionValidos(
        new mongoose.Types.ObjectId().toString()
      )
    );

  assert.equal(respuesta.status, 403);
  assert.equal(
    respuesta.body.error.codigo,
    'ACCESO_DENEGADO'
  );
});

test('POST /api/publicaciones - rechaza monitor sin perfil aprobado', async () => {
  const passwordHash = await generarPasswordHash('Password123');

  const monitor = await Usuario.create({
    nombre: 'Monitor Pendiente',
    correo: 'monitor.pendiente@urosario.edu.co',
    passwordHash,
    roles: ['monitor'],
    correoVerificado: true,
    estadoCuenta: 'habilitada',
  });

  const materia = await Materia.create({
    nombre: 'Álgebra Lineal',
    codigo: 'ALGB-102',
    facultad: 'Matemáticas',
    creditos: 3,
  });

  await PerfilMonitor.create({
    usuario: monitor._id,
    biografia:
      'Soy monitor de matemáticas con experiencia apoyando a estudiantes universitarios.',
    experienciaAcademica:
      'Estudiante de último semestre de Matemáticas con promedio destacado.',
    enfoqueEnsenanza:
      'Explico con ejemplos paso a paso y refuerzo los conceptos con ejercicios.',
    materiasOfrecidas: [materia._id],
    tarifaPorHora: 25000,
    modalidades: ['Virtual'],
    disponibilidadHoraria:
      'Lunes a viernes de 2:00 p. m. a 6:00 p. m.',
    estadoPerfil: 'Pendiente',
  });

  const cookie = await iniciarSesion(
    'monitor.pendiente@urosario.edu.co'
  );

  const respuesta = await request(app)
    .post('/api/publicaciones')
    .set('Cookie', cookie)
    .send(
      datosPublicacionValidos(
        materia._id.toString()
      )
    );

  assert.equal(respuesta.status, 403);
  assert.equal(
    respuesta.body.error.codigo,
    'MONITOR_NO_ACREDITADO'
  );
});

test('POST /api/publicaciones - rechaza materia no incluida en el perfil', async () => {
  const { monitor } =
    await crearMonitorAprobado();

  const otraMateria = await Materia.create({
    nombre: 'Programación I',
    codigo: 'PROG-101',
    facultad: 'Ingeniería',
    creditos: 4,
  });

  const cookie = await iniciarSesion(
    'monitor@urosario.edu.co'
  );

  const respuesta = await request(app)
    .post('/api/publicaciones')
    .set('Cookie', cookie)
    .send(
      datosPublicacionValidos(
        otraMateria._id.toString()
      )
    );

  assert.equal(respuesta.status, 400);
  assert.equal(
    respuesta.body.error.codigo,
    'MATERIA_NO_EN_PERFIL'
  );
});

test('GET /api/publicaciones - lista publicaciones activas', async () => {
  const { monitor, materia } =
    await crearMonitorAprobado();

  await Publicacion.create({
    monitor: monitor._id,
    materia: materia._id,
    descripcion:
      'Apoyo en derivadas, integrales y preparación de parciales con ejercicios.',
    modalidad: 'Virtual',
    tarifaPorHora: 25000,
    duracionMinutos: 90,
  });

  const cookie = await iniciarSesion(
    'monitor@urosario.edu.co'
  );

  const respuesta = await request(app)
    .get('/api/publicaciones')
    .set('Cookie', cookie);

  assert.equal(respuesta.status, 200);
  assert.equal(
    respuesta.body.publicaciones.length,
    1
  );
});

test('GET /api/publicaciones/propias - lista publicaciones del monitor', async () => {
  const { monitor, materia } =
    await crearMonitorAprobado();

  await Publicacion.create({
    monitor: monitor._id,
    materia: materia._id,
    descripcion:
      'Apoyo en derivadas, integrales y preparación de parciales con ejercicios.',
    modalidad: 'Virtual',
    tarifaPorHora: 25000,
    duracionMinutos: 90,
  });

  const cookie = await iniciarSesion(
    'monitor@urosario.edu.co'
  );

  const respuesta = await request(app)
    .get('/api/publicaciones/propias')
    .set('Cookie', cookie);

  assert.equal(respuesta.status, 200);
  assert.equal(
    respuesta.body.publicaciones.length,
    1
  );
});

test('PUT /api/publicaciones/:id - actualiza una publicación', async () => {
  const { monitor, materia } =
    await crearMonitorAprobado();

  const cookie = await iniciarSesion(
    'monitor@urosario.edu.co'
  );

  const creacion = await request(app)
    .post('/api/publicaciones')
    .set('Cookie', cookie)
    .send(
      datosPublicacionValidos(
        materia._id.toString()
      )
    );

  const idPublicacion =
    creacion.body.publicacion.id;

  const respuesta = await request(app)
    .put(`/api/publicaciones/${idPublicacion}`)
    .set('Cookie', cookie)
    .send({
      ...datosPublicacionValidos(
        materia._id.toString()
      ),
      tarifaPorHora: 30000,
    });

  assert.equal(respuesta.status, 200);
  assert.equal(
    respuesta.body.publicacion.tarifaPorHora,
    30000
  );
});

test('PATCH /api/publicaciones/:id/estado - desactiva una publicación', async () => {
  const { monitor, materia } =
    await crearMonitorAprobado();

  const cookie = await iniciarSesion(
    'monitor@urosario.edu.co'
  );

  const creacion = await request(app)
    .post('/api/publicaciones')
    .set('Cookie', cookie)
    .send(
      datosPublicacionValidos(
        materia._id.toString()
      )
    );

  const idPublicacion =
    creacion.body.publicacion.id;

  const respuesta = await request(app)
    .patch(
      `/api/publicaciones/${idPublicacion}/estado`
    )
    .set('Cookie', cookie)
    .send({
      activa: false,
    });

  assert.equal(respuesta.status, 200);
  assert.equal(
    respuesta.body.publicacion.activa,
    false
  );
});

test('DELETE /api/publicaciones/:id - elimina una publicación', async () => {
  const { monitor, materia } =
    await crearMonitorAprobado();

  const cookie = await iniciarSesion(
    'monitor@urosario.edu.co'
  );

  const creacion = await request(app)
    .post('/api/publicaciones')
    .set('Cookie', cookie)
    .send(
      datosPublicacionValidos(
        materia._id.toString()
      )
    );

  const idPublicacion =
    creacion.body.publicacion.id;

  const respuesta = await request(app)
    .delete(
      `/api/publicaciones/${idPublicacion}`
    )
    .set('Cookie', cookie);

  assert.equal(respuesta.status, 200);
  assert.equal(
    respuesta.body.mensaje,
    'Publicación eliminada correctamente'
  );
});

test('POST /api/publicaciones - rechaza materia ofrecida pero no acreditada', async () => {
  const { monitor, materia } =
    await crearMonitorAprobado();

  await PerfilMonitor.updateOne(
    {
      usuario: monitor._id,
    },
    {
      $set: {
        materiasAcreditadas: [],
      },
    }
  );

  const cookie = await iniciarSesion(
    'monitor@urosario.edu.co'
  );

  const respuesta = await request(app)
    .post('/api/publicaciones')
    .set('Cookie', cookie)
    .send(
      datosPublicacionValidos(
        materia._id.toString()
      )
    );

  assert.equal(respuesta.status, 403);
  assert.equal(
    respuesta.body.error.codigo,
    'MONITOR_NO_ACREDITADO'
  );

  const totalPublicaciones =
    await Publicacion.countDocuments({
      monitor: monitor._id,
    });

  assert.equal(totalPublicaciones, 0);
});