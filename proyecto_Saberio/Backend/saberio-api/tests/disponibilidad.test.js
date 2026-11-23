require('dotenv/config');

const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const Usuario = require('../models/usuario.model');
const Disponibilidad = require('../models/disponibilidad.model');
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

test.before(async () => {
  await mongoose.connect(process.env.MONGO_URI_TEST);
});

test.after(async () => {
  await mongoose.connection.close();
});

test.beforeEach(async () => {
  await Usuario.deleteMany({});
  await Disponibilidad.deleteMany({});
});

test('POST /api/disponibilidad - crea un bloque de disponibilidad', async () => {
  await crearMonitor();

  const cookie = await iniciarSesion(
    'monitor@urosario.edu.co'
  );

  const respuesta = await request(app)
    .post('/api/disponibilidad')
    .set('Cookie', cookie)
    .send({
      fecha: '2026-12-01',
      horaInicio: '10:00',
      horaFin: '12:00',
    });

  assert.equal(respuesta.status, 201);
  assert.equal(
    respuesta.body.mensaje,
    'Disponibilidad creada correctamente'
  );
  assert.equal(
    respuesta.body.disponibilidad.estado,
    'Disponible'
  );
});

test('POST /api/disponibilidad - rechaza usuario sin rol monitor', async () => {
  await crearEstudiante();

  const cookie = await iniciarSesion(
    'estudiante@urosario.edu.co'
  );

  const respuesta = await request(app)
    .post('/api/disponibilidad')
    .set('Cookie', cookie)
    .send({
      fecha: '2026-12-01',
      horaInicio: '10:00',
      horaFin: '12:00',
    });

  assert.equal(respuesta.status, 403);
  assert.equal(
    respuesta.body.error.codigo,
    'ACCESO_DENEGADO'
  );
});

test('POST /api/disponibilidad - rechaza horario inválido', async () => {
  await crearMonitor();

  const cookie = await iniciarSesion(
    'monitor@urosario.edu.co'
  );

  const respuesta = await request(app)
    .post('/api/disponibilidad')
    .set('Cookie', cookie)
    .send({
      fecha: '2026-12-01',
      horaInicio: '14:00',
      horaFin: '12:00',
    });

  assert.equal(respuesta.status, 400);
  assert.equal(
    respuesta.body.error.codigo,
    'HORARIO_INVALIDO'
  );
});

test('POST /api/disponibilidad - rechaza horario superpuesto', async () => {
  await crearMonitor();

  const cookie = await iniciarSesion(
    'monitor@urosario.edu.co'
  );

  await request(app)
    .post('/api/disponibilidad')
    .set('Cookie', cookie)
    .send({
      fecha: '2026-12-01',
      horaInicio: '10:00',
      horaFin: '12:00',
    });

  const respuesta = await request(app)
    .post('/api/disponibilidad')
    .set('Cookie', cookie)
    .send({
      fecha: '2026-12-01',
      horaInicio: '11:00',
      horaFin: '13:00',
    });

  assert.equal(respuesta.status, 400);
  assert.equal(
    respuesta.body.error.codigo,
    'HORARIO_SUPERPUESTO'
  );
});

test('GET /api/disponibilidad - lista las disponibilidades del monitor', async () => {
  await crearMonitor();

  const cookie = await iniciarSesion(
    'monitor@urosario.edu.co'
  );

  await request(app)
    .post('/api/disponibilidad')
    .set('Cookie', cookie)
    .send({
      fecha: '2026-12-01',
      horaInicio: '10:00',
      horaFin: '12:00',
    });

  const respuesta = await request(app)
    .get('/api/disponibilidad')
    .set('Cookie', cookie);

  assert.equal(respuesta.status, 200);
  assert.equal(
    respuesta.body.disponibilidades.length,
    1
  );
});

test('GET /api/disponibilidad/monitor/:id - lista solo horarios disponibles', async () => {
  const monitor = await crearMonitor();

  const cookie = await iniciarSesion(
    'monitor@urosario.edu.co'
  );

  await request(app)
    .post('/api/disponibilidad')
    .set('Cookie', cookie)
    .send({
      fecha: '2026-12-01',
      horaInicio: '10:00',
      horaFin: '12:00',
    });

  await Disponibilidad.create({
    monitor: monitor._id,
    fecha: '2026-12-02',
    horaInicio: '14:00',
    horaFin: '16:00',
    estado: 'Bloqueado',
  });

  const respuesta = await request(app)
    .get(
      `/api/disponibilidad/monitor/${monitor._id}`
    )
    .set('Cookie', cookie);

  assert.equal(respuesta.status, 200);
  assert.equal(
    respuesta.body.disponibilidades.length,
    1
  );
  assert.equal(
    respuesta.body.disponibilidades[0].estado,
    'Disponible'
  );
});

test('PATCH /api/disponibilidad/:id/estado - bloquea un horario', async () => {
  const monitor = await crearMonitor();

  const cookie = await iniciarSesion(
    'monitor@urosario.edu.co'
  );

  const creacion = await request(app)
    .post('/api/disponibilidad')
    .set('Cookie', cookie)
    .send({
      fecha: '2026-12-01',
      horaInicio: '10:00',
      horaFin: '12:00',
    });

  const idDisponibilidad =
    creacion.body.disponibilidad.id;

  const respuesta = await request(app)
    .patch(
      `/api/disponibilidad/${idDisponibilidad}/estado`
    )
    .set('Cookie', cookie)
    .send({
      estado: 'Bloqueado',
    });

  assert.equal(respuesta.status, 200);
  assert.equal(
    respuesta.body.disponibilidad.estado,
    'Bloqueado'
  );
});

test('PATCH /api/disponibilidad/:id/estado - rechaza estado inválido', async () => {
  const monitor = await crearMonitor();

  const cookie = await iniciarSesion(
    'monitor@urosario.edu.co'
  );

  const creacion = await request(app)
    .post('/api/disponibilidad')
    .set('Cookie', cookie)
    .send({
      fecha: '2026-12-01',
      horaInicio: '10:00',
      horaFin: '12:00',
    });

  const idDisponibilidad =
    creacion.body.disponibilidad.id;

  const respuesta = await request(app)
    .patch(
      `/api/disponibilidad/${idDisponibilidad}/estado`
    )
    .set('Cookie', cookie)
    .send({
      estado: 'EstadoInventado',
    });

  assert.equal(respuesta.status, 400);
  assert.equal(
    respuesta.body.error.codigo,
    'ESTADO_INVALIDO'
  );
});

test('DELETE /api/disponibilidad/:id - elimina un horario disponible', async () => {
  const monitor = await crearMonitor();

  const cookie = await iniciarSesion(
    'monitor@urosario.edu.co'
  );

  const creacion = await request(app)
    .post('/api/disponibilidad')
    .set('Cookie', cookie)
    .send({
      fecha: '2026-12-01',
      horaInicio: '10:00',
      horaFin: '12:00',
    });

  const idDisponibilidad =
    creacion.body.disponibilidad.id;

  const respuesta = await request(app)
    .delete(
      `/api/disponibilidad/${idDisponibilidad}`
    )
    .set('Cookie', cookie);

  assert.equal(respuesta.status, 200);
  assert.equal(
    respuesta.body.mensaje,
    'Disponibilidad eliminada correctamente'
  );
});

test('DELETE /api/disponibilidad/:id - rechaza eliminar horario reservado', async () => {
  const monitor = await crearMonitor();

  const cookie = await iniciarSesion(
    'monitor@urosario.edu.co'
  );

  const disponibilidad = await Disponibilidad.create({
    monitor: monitor._id,
    fecha: '2026-12-01',
    horaInicio: '10:00',
    horaFin: '12:00',
    estado: 'Reservado',
  });

  const respuesta = await request(app)
    .delete(
      `/api/disponibilidad/${disponibilidad._id}`
    )
    .set('Cookie', cookie);

  assert.equal(respuesta.status, 400);
  assert.equal(
    respuesta.body.error.codigo,
    'HORARIO_RESERVADO'
  );
});
test('PATCH /api/disponibilidad/:id/estado - rechaza modificar disponibilidad ajena', async () => {
  const monitor = await crearMonitor();

  const passwordHash =
    await generarPasswordHash('Password123');

  await Usuario.create({
    nombre: 'Otro Monitor',
    correo:
      'otro.monitor@urosario.edu.co',
    passwordHash,
    roles: ['monitor'],
    correoVerificado: true,
    estadoCuenta: 'habilitada',
  });

  const disponibilidad =
    await Disponibilidad.create({
      monitor: monitor._id,
      fecha: '2026-12-01',
      horaInicio: '10:00',
      horaFin: '12:00',
      estado: 'Disponible',
    });

  const cookieOtroMonitor =
    await iniciarSesion(
      'otro.monitor@urosario.edu.co'
    );

  const respuesta = await request(app)
    .patch(
      `/api/disponibilidad/${disponibilidad._id}/estado`
    )
    .set('Cookie', cookieOtroMonitor)
    .send({
      estado: 'Bloqueado',
    });

  assert.equal(respuesta.status, 403);
  assert.equal(
    respuesta.body.error.codigo,
    'ACCESO_DENEGADO'
  );

  const disponibilidadActualizada =
    await Disponibilidad.findById(
      disponibilidad._id
    );

  assert.equal(
    disponibilidadActualizada.estado,
    'Disponible'
  );
});

test('DELETE /api/disponibilidad/:id - rechaza eliminar disponibilidad ajena', async () => {
  const monitor = await crearMonitor();

  const passwordHash =
    await generarPasswordHash('Password123');

  await Usuario.create({
    nombre: 'Otro Monitor',
    correo:
      'otro.monitor@urosario.edu.co',
    passwordHash,
    roles: ['monitor'],
    correoVerificado: true,
    estadoCuenta: 'habilitada',
  });

  const disponibilidad =
    await Disponibilidad.create({
      monitor: monitor._id,
      fecha: '2026-12-01',
      horaInicio: '10:00',
      horaFin: '12:00',
      estado: 'Disponible',
    });

  const cookieOtroMonitor =
    await iniciarSesion(
      'otro.monitor@urosario.edu.co'
    );

  const respuesta = await request(app)
    .delete(
      `/api/disponibilidad/${disponibilidad._id}`
    )
    .set('Cookie', cookieOtroMonitor);

  assert.equal(respuesta.status, 403);
  assert.equal(
    respuesta.body.error.codigo,
    'ACCESO_DENEGADO'
  );

  const disponibilidadExistente =
    await Disponibilidad.findById(
      disponibilidad._id
    );

  assert.ok(disponibilidadExistente);
});