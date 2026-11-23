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

async function crearSolicitudAceptada(estudiante, monitor, materia) {
  return SolicitudTutoria.create({
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

function datosSesionValidos(idSolicitud) {
  return {
    solicitud: idSolicitud,
    fecha: '2026-12-01',
    hora: '15:00',
    duracionHoras: 2,
    lugarOEnlace: 'https://meet.google.com/saberio',
    notas: 'Repasaremos límites y derivadas.',
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
  await SolicitudTutoria.deleteMany({});
  await SesionTutoria.deleteMany({});
});

test('POST /api/sesiones - crea una sesión como monitor', async () => {
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

  const solicitud = await crearSolicitudAceptada(
    estudiante,
    monitor,
    materia
  );

  const cookie = await iniciarSesion(
    'monitor@urosario.edu.co'
  );

  const respuesta = await request(app)
    .post('/api/sesiones')
    .set('Cookie', cookie)
    .send(
      datosSesionValidos(
        solicitud._id.toString()
      )
    );

  assert.equal(respuesta.status, 201);
  assert.equal(
    respuesta.body.mensaje,
    'Sesión de tutoría creada correctamente'
  );
  assert.equal(
    respuesta.body.sesion.estado,
    'Programada'
  );
  assert.equal(
    respuesta.body.sesion.tema,
    'Derivadas y límites'
  );
});

test('POST /api/sesiones - rechaza usuario sin rol monitor', async () => {
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

  const solicitud = await crearSolicitudAceptada(
    estudiante,
    monitor,
    materia
  );

  const cookie = await iniciarSesion(
    'sofia.martinez@urosario.edu.co'
  );

  const respuesta = await request(app)
    .post('/api/sesiones')
    .set('Cookie', cookie)
    .send(
      datosSesionValidos(
        solicitud._id.toString()
      )
    );

  assert.equal(respuesta.status, 403);
  assert.equal(
    respuesta.body.error.codigo,
    'ACCESO_DENEGADO'
  );
});

test('POST /api/sesiones - rechaza solicitud inexistente', async () => {
  await crearUsuario({
    nombre: 'Monitor Prueba',
    correo: 'monitor@urosario.edu.co',
    roles: ['monitor'],
  });

  const cookie = await iniciarSesion(
    'monitor@urosario.edu.co'
  );

  const respuesta = await request(app)
    .post('/api/sesiones')
    .set('Cookie', cookie)
    .send(
      datosSesionValidos(
        new mongoose.Types.ObjectId().toString()
      )
    );

  assert.equal(respuesta.status, 404);
  assert.equal(
    respuesta.body.error.codigo,
    'SOLICITUD_NO_ENCONTRADA'
  );
});

test('POST /api/sesiones - rechaza solicitud no aceptada', async () => {
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
    estado: 'Pendiente',
  });

  const cookie = await iniciarSesion(
    'monitor@urosario.edu.co'
  );

  const respuesta = await request(app)
    .post('/api/sesiones')
    .set('Cookie', cookie)
    .send(
      datosSesionValidos(
        solicitud._id.toString()
      )
    );

  assert.equal(respuesta.status, 400);
  assert.equal(
    respuesta.body.error.codigo,
    'SOLICITUD_NO_ACEPTADA'
  );
});

test('POST /api/sesiones - rechaza sesión duplicada', async () => {
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

  const solicitud = await crearSolicitudAceptada(
    estudiante,
    monitor,
    materia
  );

  const cookie = await iniciarSesion(
    'monitor@urosario.edu.co'
  );

  await request(app)
    .post('/api/sesiones')
    .set('Cookie', cookie)
    .send(
      datosSesionValidos(
        solicitud._id.toString()
      )
    );

  const respuesta = await request(app)
    .post('/api/sesiones')
    .set('Cookie', cookie)
    .send(
      datosSesionValidos(
        solicitud._id.toString()
      )
    );

  assert.equal(respuesta.status, 400);
  assert.equal(
    respuesta.body.error.codigo,
    'SESION_EXISTENTE'
  );
});

test('GET /api/sesiones - lista sesiones del estudiante', async () => {
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

  const solicitud = await crearSolicitudAceptada(
    estudiante,
    monitor,
    materia
  );

  const cookieMonitor = await iniciarSesion(
    'monitor@urosario.edu.co'
  );

  await request(app)
    .post('/api/sesiones')
    .set('Cookie', cookieMonitor)
    .send(
      datosSesionValidos(
        solicitud._id.toString()
      )
    );

  const cookieEstudiante = await iniciarSesion(
    'sofia.martinez@urosario.edu.co'
  );

  const respuesta = await request(app)
    .get('/api/sesiones')
    .set('Cookie', cookieEstudiante);

  assert.equal(respuesta.status, 200);
  assert.equal(respuesta.body.sesiones.length, 1);
  assert.equal(
    respuesta.body.sesiones[0].estado,
    'Programada'
  );
});

test('GET /api/sesiones - lista sesiones del monitor', async () => {
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

  const solicitud = await crearSolicitudAceptada(
    estudiante,
    monitor,
    materia
  );

  const cookie = await iniciarSesion(
    'monitor@urosario.edu.co'
  );

  await request(app)
    .post('/api/sesiones')
    .set('Cookie', cookie)
    .send(
      datosSesionValidos(
        solicitud._id.toString()
      )
    );

  const respuesta = await request(app)
    .get('/api/sesiones')
    .set('Cookie', cookie);

  assert.equal(respuesta.status, 200);
  assert.equal(respuesta.body.sesiones.length, 1);
  assert.equal(
    respuesta.body.sesiones[0].estado,
    'Programada'
  );
});

test('GET /api/sesiones/:id - obtiene una sesión', async () => {
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

  const solicitud = await crearSolicitudAceptada(
    estudiante,
    monitor,
    materia
  );

  const cookieMonitor = await iniciarSesion(
    'monitor@urosario.edu.co'
  );

  const creacion = await request(app)
    .post('/api/sesiones')
    .set('Cookie', cookieMonitor)
    .send(
      datosSesionValidos(
        solicitud._id.toString()
      )
    );

  const idSesion =
    creacion.body.sesion.id;

  const cookieEstudiante = await iniciarSesion(
    'sofia.martinez@urosario.edu.co'
  );

  const respuesta = await request(app)
    .get(`/api/sesiones/${idSesion}`)
    .set('Cookie', cookieEstudiante);

  assert.equal(respuesta.status, 200);
  assert.equal(
    respuesta.body.sesion.id,
    idSesion
  );
});

test('PATCH /api/sesiones/:id/finalizar - finaliza una sesión', async () => {
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

  const solicitud = await crearSolicitudAceptada(
    estudiante,
    monitor,
    materia
  );

  const cookie = await iniciarSesion(
    'monitor@urosario.edu.co'
  );

  const creacion = await request(app)
    .post('/api/sesiones')
    .set('Cookie', cookie)
    .send(
      datosSesionValidos(
        solicitud._id.toString()
      )
    );

  const idSesion =
    creacion.body.sesion.id;

  const respuesta = await request(app)
    .patch(`/api/sesiones/${idSesion}/finalizar`)
    .set('Cookie', cookie)
    .send({
      notas:
        'Se repasaron límites y derivadas con ejercicios.',
    });

  assert.equal(respuesta.status, 200);
  assert.equal(
    respuesta.body.sesion.estado,
    'Completada'
  );
});

test('PATCH /api/sesiones/:id/finalizar - rechaza estudiante', async () => {
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

  const solicitud = await crearSolicitudAceptada(
    estudiante,
    monitor,
    materia
  );

  const cookieMonitor = await iniciarSesion(
    'monitor@urosario.edu.co'
  );

  const creacion = await request(app)
    .post('/api/sesiones')
    .set('Cookie', cookieMonitor)
    .send(
      datosSesionValidos(
        solicitud._id.toString()
      )
    );

  const idSesion =
    creacion.body.sesion.id;

  const cookieEstudiante = await iniciarSesion(
    'sofia.martinez@urosario.edu.co'
  );

  const respuesta = await request(app)
    .patch(`/api/sesiones/${idSesion}/finalizar`)
    .set('Cookie', cookieEstudiante)
    .send({
      notas: 'Intento de finalización',
    });

  assert.equal(respuesta.status, 403);
  assert.equal(
    respuesta.body.error.codigo,
    'ACCESO_DENEGADO'
  );
});
test('POST /api/sesiones - rechaza monitor ajeno a la solicitud', async () => {
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

  const otroMonitor = await crearUsuario({
    nombre: 'Otro Monitor',
    correo: 'otro.monitor@urosario.edu.co',
    roles: ['monitor'],
  });

  const materia = await crearMateria();

  const solicitud = await crearSolicitudAceptada(
    estudiante,
    monitor,
    materia
  );

  const cookieOtroMonitor = await iniciarSesion(
    'otro.monitor@urosario.edu.co'
  );

  const respuesta = await request(app)
    .post('/api/sesiones')
    .set('Cookie', cookieOtroMonitor)
    .send(
      datosSesionValidos(
        solicitud._id.toString()
      )
    );

  assert.equal(respuesta.status, 403);
  assert.equal(
    respuesta.body.error.codigo,
    'ACCESO_DENEGADO'
  );

  const totalSesiones =
    await SesionTutoria.countDocuments();

  assert.equal(totalSesiones, 0);
});
test('PATCH /api/sesiones/:id/finalizar - rechaza finalizar una sesión ya completada', async () => {
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

  const solicitud = await crearSolicitudAceptada(
    estudiante,
    monitor,
    materia
  );

  const cookie = await iniciarSesion(
    'monitor@urosario.edu.co'
  );

  const creacion = await request(app)
    .post('/api/sesiones')
    .set('Cookie', cookie)
    .send(
      datosSesionValidos(
        solicitud._id.toString()
      )
    );

  const idSesion =
    creacion.body.sesion.id;

  const primera = await request(app)
    .patch(`/api/sesiones/${idSesion}/finalizar`)
    .set('Cookie', cookie)
    .send({
      notas:
        'Se repasaron límites y derivadas con ejercicios.',
    });

  assert.equal(primera.status, 200);
  assert.equal(
    primera.body.sesion.estado,
    'Completada'
  );

  const segunda = await request(app)
    .patch(`/api/sesiones/${idSesion}/finalizar`)
    .set('Cookie', cookie)
    .send({
      notas: 'Intento de finalización adicional.',
    });

  assert.equal(segunda.status, 400);
  assert.equal(
    segunda.body.error.codigo,
    'SESION_NO_PROGRAMADA'
  );

  const sesion = await SesionTutoria.findById(
    idSesion
  );

  assert.equal(sesion.estado, 'Completada');
  assert.equal(
    sesion.notas,
    'Se repasaron límites y derivadas con ejercicios.'
  );
});