require('dotenv/config');

const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const Usuario = require('../models/usuario.model');
const Materia = require('../models/materia.model');
const SolicitudTutoria = require('../models/solicitudTutoria.model');
const Publicacion = require('../models/publicacion.model');
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

async function crearPublicacionActiva(
  idMonitor,
  idMateria
) {
  return Publicacion.create({
    monitor: idMonitor,
    materia: idMateria,
    descripcion:
      'Apoyo en derivadas, integrales y preparación de parciales con ejercicios.',
    modalidad: 'Virtual',
    tarifaPorHora: 25000,
    duracionMinutos: 90,
    activa: true,
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

function datosSolicitudValidos(idMonitor, idMateria) {
  return {
    monitor: idMonitor,
    materia: idMateria,
    tema: 'Derivadas y límites',
    descripcion:
      'Necesito ayuda para entender límites y derivadas antes del parcial.',
    modalidad: 'Virtual',
    fechaPreferida: '2026-12-01',
    horaPreferida: '15:00',
    duracionEstimadaHoras: 2,
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
  await Publicacion.deleteMany({});
});

test('POST /api/solicitudes - crea una solicitud como estudiante', async () => {
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

  await crearPublicacionActiva(
    monitor._id,
    materia._id
  );

  const cookie = await iniciarSesion(
    'sofia.martinez@urosario.edu.co'
  );

  const respuesta = await request(app)
    .post('/api/solicitudes')
    .set('Cookie', cookie)
    .send(
      datosSolicitudValidos(
        monitor._id.toString(),
        materia._id.toString()
      )
    );

  assert.equal(respuesta.status, 201);
  assert.equal(
    respuesta.body.mensaje,
    'Solicitud de tutoría creada correctamente'
  );
  assert.equal(
    respuesta.body.solicitud.estado,
    'Pendiente'
  );
  assert.equal(
    respuesta.body.solicitud.tema,
    'Derivadas y límites'
  );
});

test('POST /api/solicitudes - rechaza usuario sin rol estudiante', async () => {
  const monitor = await crearUsuario({
    nombre: 'Monitor Prueba',
    correo: 'monitor@urosario.edu.co',
    roles: ['monitor'],
  });

  const materia = await crearMateria();

  await crearPublicacionActiva(
    monitor._id,
    materia._id
  );

  const cookie = await iniciarSesion(
    'monitor@urosario.edu.co'
  );

  const respuesta = await request(app)
    .post('/api/solicitudes')
    .set('Cookie', cookie)
    .send(
      datosSolicitudValidos(
        monitor._id.toString(),
        materia._id.toString()
      )
    );

  assert.equal(respuesta.status, 403);
  assert.equal(
    respuesta.body.error.codigo,
    'ACCESO_DENEGADO'
  );
});

test('POST /api/solicitudes - rechaza monitor inexistente', async () => {
  await crearUsuario({
    nombre: 'Sofia Martinez',
    correo: 'sofia.martinez@urosario.edu.co',
    roles: ['estudiante'],
  });

  const materia = await crearMateria();

  const cookie = await iniciarSesion(
    'sofia.martinez@urosario.edu.co'
  );

  const respuesta = await request(app)
    .post('/api/solicitudes')
    .set('Cookie', cookie)
    .send(
      datosSolicitudValidos(
        new mongoose.Types.ObjectId().toString(),
        materia._id.toString()
      )
    );

  assert.equal(respuesta.status, 400);
  assert.equal(
    respuesta.body.error.codigo,
    'MONITOR_INVALIDO'
  );
});

test('POST /api/solicitudes - rechaza materia inexistente', async () => {
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

  const cookie = await iniciarSesion(
    'sofia.martinez@urosario.edu.co'
  );

  const respuesta = await request(app)
    .post('/api/solicitudes')
    .set('Cookie', cookie)
    .send(
      datosSolicitudValidos(
        monitor._id.toString(),
        new mongoose.Types.ObjectId().toString()
      )
    );

  assert.equal(respuesta.status, 400);
  assert.equal(
    respuesta.body.error.codigo,
    'MATERIA_INVALIDA'
  );
});

test('POST /api/solicitudes - rechaza monitor sin publicación activa', async () => {
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

  const cookie = await iniciarSesion(
    'sofia.martinez@urosario.edu.co'
  );

  const respuesta = await request(app)
    .post('/api/solicitudes')
    .set('Cookie', cookie)
    .send(
      datosSolicitudValidos(
        monitor._id.toString(),
        materia._id.toString()
      )
    );

  assert.equal(respuesta.status, 400);
  assert.equal(
    respuesta.body.error.codigo,
    'PUBLICACION_NO_DISPONIBLE'
  );

  const totalSolicitudes =
    await SolicitudTutoria.countDocuments();

  assert.equal(totalSolicitudes, 0);
});

test('POST /api/solicitudes - rechaza solicitud pendiente duplicada', async () => {
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

  await crearPublicacionActiva(
    monitor._id,
    materia._id
  );

  const cookie = await iniciarSesion(
    'sofia.martinez@urosario.edu.co'
  );

  const primera = await request(app)
    .post('/api/solicitudes')
    .set('Cookie', cookie)
    .send(
      datosSolicitudValidos(
        monitor._id.toString(),
        materia._id.toString()
      )
    );

  assert.equal(primera.status, 201);

  const segunda = await request(app)
    .post('/api/solicitudes')
    .set('Cookie', cookie)
    .send(
      datosSolicitudValidos(
        monitor._id.toString(),
        materia._id.toString()
      )
    );

  assert.equal(segunda.status, 400);
  assert.equal(
    segunda.body.error.codigo,
    'SOLICITUD_DUPLICADA'
  );

  const totalSolicitudes =
    await SolicitudTutoria.countDocuments();

  assert.equal(totalSolicitudes, 1);
});

test('POST /api/solicitudes - rechaza hora inválida', async () => {
  await crearUsuario({
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

  await crearPublicacionActiva(
    monitor._id,
    materia._id
  );

  const cookie = await iniciarSesion(
    'sofia.martinez@urosario.edu.co'
  );

  const respuesta = await request(app)
    .post('/api/solicitudes')
    .set('Cookie', cookie)
    .send({
      ...datosSolicitudValidos(
        monitor._id.toString(),
        materia._id.toString()
      ),
      horaPreferida: '25:00',
    });

  assert.equal(respuesta.status, 400);
  assert.equal(
    respuesta.body.error.codigo,
    'HORA_INVALIDA'
  );
});

test('GET /api/solicitudes - lista solicitudes del estudiante', async () => {
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

  await crearPublicacionActiva(
    monitor._id,
    materia._id
  );

  const cookie = await iniciarSesion(
    'sofia.martinez@urosario.edu.co'
  );

  await request(app)
    .post('/api/solicitudes')
    .set('Cookie', cookie)
    .send(
      datosSolicitudValidos(
        monitor._id.toString(),
        materia._id.toString()
      )
    );

  const respuesta = await request(app)
    .get('/api/solicitudes')
    .set('Cookie', cookie);

  assert.equal(respuesta.status, 200);
  assert.equal(respuesta.body.solicitudes.length, 1);
  assert.equal(
    respuesta.body.solicitudes[0].tema,
    'Derivadas y límites'
  );
});

test('GET /api/solicitudes - lista solicitudes del monitor', async () => {
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

  await crearPublicacionActiva(
    monitor._id,
    materia._id
  );

  const cookieEstudiante = await iniciarSesion(
    'sofia.martinez@urosario.edu.co'
  );

  await request(app)
    .post('/api/solicitudes')
    .set('Cookie', cookieEstudiante)
    .send(
      datosSolicitudValidos(
        monitor._id.toString(),
        materia._id.toString()
      )
    );

  const cookieMonitor = await iniciarSesion(
    'monitor@urosario.edu.co'
  );

  const respuesta = await request(app)
    .get('/api/solicitudes')
    .set('Cookie', cookieMonitor);

  assert.equal(respuesta.status, 200);
  assert.equal(respuesta.body.solicitudes.length, 1);
  assert.equal(
    respuesta.body.solicitudes[0].estado,
    'Pendiente'
  );
});

test('GET /api/solicitudes/:id - obtiene una solicitud', async () => {
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

  await crearPublicacionActiva(
    monitor._id,
    materia._id
  );

  const cookie = await iniciarSesion(
    'sofia.martinez@urosario.edu.co'
  );

  const creacion = await request(app)
    .post('/api/solicitudes')
    .set('Cookie', cookie)
    .send(
      datosSolicitudValidos(
        monitor._id.toString(),
        materia._id.toString()
      )
    );

  const idSolicitud =
    creacion.body.solicitud.id;

  const respuesta = await request(app)
    .get(`/api/solicitudes/${idSolicitud}`)
    .set('Cookie', cookie);

  assert.equal(respuesta.status, 200);
  assert.equal(
    respuesta.body.solicitud.id,
    idSolicitud
  );
});

test('PATCH /api/solicitudes/:id/estado - acepta una solicitud', async () => {
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

  await crearPublicacionActiva(
    monitor._id,
    materia._id
  );

  const cookieEstudiante = await iniciarSesion(
    'sofia.martinez@urosario.edu.co'
  );

  const creacion = await request(app)
    .post('/api/solicitudes')
    .set('Cookie', cookieEstudiante)
    .send(
      datosSolicitudValidos(
        monitor._id.toString(),
        materia._id.toString()
      )
    );

  const idSolicitud =
    creacion.body.solicitud.id;

  const cookieMonitor = await iniciarSesion(
    'monitor@urosario.edu.co'
  );

  const respuesta = await request(app)
    .patch(`/api/solicitudes/${idSolicitud}/estado`)
    .set('Cookie', cookieMonitor)
    .send({
      estado: 'Aceptada',
      respuestaMonitor:
        'Hola, podemos revisar límites y derivadas.',
    });

  assert.equal(respuesta.status, 200);
  assert.equal(
    respuesta.body.solicitud.estado,
    'Aceptada'
  );
});

test('PATCH /api/solicitudes/:id/estado - rechaza estado inválido', async () => {
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

  await crearPublicacionActiva(
    monitor._id,
    materia._id
  );

  const cookieEstudiante = await iniciarSesion(
    'sofia.martinez@urosario.edu.co'
  );

  const creacion = await request(app)
    .post('/api/solicitudes')
    .set('Cookie', cookieEstudiante)
    .send(
      datosSolicitudValidos(
        monitor._id.toString(),
        materia._id.toString()
      )
    );

  const idSolicitud =
    creacion.body.solicitud.id;

  const cookieMonitor = await iniciarSesion(
    'monitor@urosario.edu.co'
  );

  const respuesta = await request(app)
    .patch(`/api/solicitudes/${idSolicitud}/estado`)
    .set('Cookie', cookieMonitor)
    .send({
      estado: 'EstadoInventado',
    });

  assert.equal(respuesta.status, 400);
  assert.equal(
    respuesta.body.error.codigo,
    'ESTADO_INVALIDO'
  );
});