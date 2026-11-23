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
const Disponibilidad = require('../models/disponibilidad.model');
const Evaluacion = require('../models/evaluacion.model');
const {
  generarPasswordHash,
} = require('../src/services/password.service');

async function crearMonitorAprobado(
  nombre,
  correo,
  tarifa,
  calificacion
) {
  const passwordHash = await generarPasswordHash('Password123');

  const monitor = await Usuario.create({
    nombre,
    correo,
    passwordHash,
    roles: ['monitor'],
    correoVerificado: true,
    estadoCuenta: 'habilitada',
  });

  let materia = await Materia.findOne({
    codigo: 'CALC-101',
  });

  if (!materia) {
    materia = await Materia.create({
      nombre: 'Cálculo Diferencial',
      codigo: 'CALC-101',
      facultad: 'Ingeniería',
      creditos: 4,
    });
  }

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
    tarifaPorHora: tarifa,
    modalidades: ['Virtual'],
    disponibilidadHoraria:
      'Lunes a viernes de 2:00 p. m. a 6:00 p. m.',
    estadoPerfil: 'Aprobado',
  });

  await Publicacion.create({
    monitor: monitor._id,
    materia: materia._id,
    descripcion:
      'Apoyo en derivadas, integrales y preparación de parciales con ejercicios.',
    modalidad: 'Virtual',
    tarifaPorHora: tarifa,
    duracionMinutos: 90,
  });

  await Disponibilidad.create({
    monitor: monitor._id,
    fecha: '2026-12-01',
    horaInicio: '14:00',
    horaFin: '16:00',
    estado: 'Disponible',
  });

  if (calificacion) {
    await Evaluacion.create({
      estudiante: monitor._id,
      monitor: monitor._id,
      sesion: new mongoose.Types.ObjectId(),
      calificacion,
      comentario:
        'Excelente explicación y mucha paciencia para resolver dudas.',
    });
  }

  return {
    monitor,
    materia,
  };
}

async function crearEstudiante() {
  const passwordHash = await generarPasswordHash('Password123');

  await Usuario.create({
    nombre: 'Estudiante Prueba',
    correo: 'estudiante@urosario.edu.co',
    passwordHash,
    roles: ['estudiante'],
    correoVerificado: true,
    estadoCuenta: 'habilitada',
  });

  const respuesta = await request(app)
    .post('/api/auth/login')
    .send({
      correo: 'estudiante@urosario.edu.co',
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
  await PerfilMonitor.deleteMany({});
  await Publicacion.deleteMany({});
  await Disponibilidad.deleteMany({});
  await Evaluacion.deleteMany({});
});

test('GET /api/busqueda/monitores - lista monitores con publicaciones activas', async () => {
  await crearMonitorAprobado(
    'Monitor Uno',
    'monitor.uno@urosario.edu.co',
    25000,
    5
  );

  const cookie = await crearEstudiante();

  const respuesta = await request(app)
    .get('/api/busqueda/monitores')
    .set('Cookie', cookie);

  assert.equal(respuesta.status, 200);
  assert.equal(
    respuesta.body.monitores.length,
    1
  );
});

test('GET /api/busqueda/monitores - filtra por materia', async () => {
  const { materia } =
    await crearMonitorAprobado(
      'Monitor Uno',
      'monitor.uno@urosario.edu.co',
      25000,
      5
    );

  const cookie = await crearEstudiante();

  const respuesta = await request(app)
    .get(
      `/api/busqueda/monitores?materia=${materia._id}`
    )
    .set('Cookie', cookie);

  assert.equal(respuesta.status, 200);
  assert.equal(
    respuesta.body.monitores.length,
    1
  );
});

test('GET /api/busqueda/monitores - filtra por modalidad', async () => {
  await crearMonitorAprobado(
    'Monitor Uno',
    'monitor.uno@urosario.edu.co',
    25000,
    5
  );

  const cookie = await crearEstudiante();

  const respuesta = await request(app)
    .get(
      '/api/busqueda/monitores?modalidad=Virtual'
    )
    .set('Cookie', cookie);

  assert.equal(respuesta.status, 200);
  assert.equal(
    respuesta.body.monitores.length,
    1
  );
});

test('GET /api/busqueda/monitores - filtra por calificación mínima', async () => {
  await crearMonitorAprobado(
    'Monitor Uno',
    'monitor.uno@urosario.edu.co',
    25000,
    5
  );

  await crearMonitorAprobado(
    'Monitor Dos',
    'monitor.dos@urosario.edu.co',
    25000,
    3
  );

  const cookie = await crearEstudiante();

  const respuesta = await request(app)
    .get(
      '/api/busqueda/monitores?calificacionMinima=4.5'
    )
    .set('Cookie', cookie);

  assert.equal(respuesta.status, 200);
  assert.equal(
    respuesta.body.monitores.length,
    1
  );
});

test('GET /api/busqueda/monitores - filtra por precio máximo', async () => {
  await crearMonitorAprobado(
    'Monitor Uno',
    'monitor.uno@urosario.edu.co',
    25000,
    5
  );

  await crearMonitorAprobado(
    'Monitor Dos',
    'monitor.dos@urosario.edu.co',
    40000,
    5
  );

  const cookie = await crearEstudiante();

  const respuesta = await request(app)
    .get(
      '/api/busqueda/monitores?precioMaximo=30000'
    )
    .set('Cookie', cookie);

  assert.equal(respuesta.status, 200);
  assert.equal(
    respuesta.body.monitores.length,
    1
  );
});

test('GET /api/busqueda/monitores - filtra por fecha y hora disponibles', async () => {
  await crearMonitorAprobado(
    'Monitor Uno',
    'monitor.uno@urosario.edu.co',
    25000,
    5
  );

  const cookie = await crearEstudiante();

  const respuesta = await request(app)
    .get(
      '/api/busqueda/monitores?fecha=2026-12-01&hora=15:00'
    )
    .set('Cookie', cookie);

  assert.equal(respuesta.status, 200);
  assert.equal(
    respuesta.body.monitores.length,
    1
  );
});

test('GET /api/busqueda/monitores - ordena por precio', async () => {
  await crearMonitorAprobado(
    'Monitor Uno',
    'monitor.uno@urosario.edu.co',
    40000,
    5
  );

  await crearMonitorAprobado(
    'Monitor Dos',
    'monitor.dos@urosario.edu.co',
    25000,
    5
  );

  const cookie = await crearEstudiante();

  const respuesta = await request(app)
    .get(
      '/api/busqueda/monitores?orden=precio'
    )
    .set('Cookie', cookie);

  assert.equal(respuesta.status, 200);
  assert.equal(
    respuesta.body.monitores[0].publicaciones[0].tarifaPorHora,
    25000
  );
});

test('GET /api/busqueda/monitores/:id - obtiene el perfil público de un monitor', async () => {
  const { monitor } =
    await crearMonitorAprobado(
      'Monitor Uno',
      'monitor.uno@urosario.edu.co',
      25000,
      5
    );

  const cookie = await crearEstudiante();

  const respuesta = await request(app)
    .get(
      `/api/busqueda/monitores/${monitor._id}`
    )
    .set('Cookie', cookie);

  assert.equal(respuesta.status, 200);
  assert.equal(
    respuesta.body.monitor.monitor.nombre,
    'Monitor Uno'
  );
  assert.equal(
    respuesta.body.monitor.calificacion,
    5
  );
});
test('GET /api/busqueda/monitores - excluye monitor con materia no acreditada', async () => {
  const passwordHash =
    await generarPasswordHash('Password123');

  const monitor = await Usuario.create({
    nombre: 'Monitor No Acreditado',
    correo:
      'monitor.no.acreditado.busqueda@urosario.edu.co',
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
    tarifaPorHora: 25000,
    modalidades: ['Virtual'],
    disponibilidadHoraria:
      'Lunes a viernes de 2:00 p. m. a 6:00 p. m.',
    estadoPerfil: 'Aprobado',
  });

  await Publicacion.create({
    monitor: monitor._id,
    materia: materia._id,
    descripcion:
      'Apoyo en derivadas, integrales y preparación de parciales con ejercicios.',
    modalidad: 'Virtual',
    tarifaPorHora: 25000,
    duracionMinutos: 90,
    activa: true,
  });

  const cookie = await crearEstudiante();

  const respuesta = await request(app)
    .get('/api/busqueda/monitores')
    .set('Cookie', cookie)
    .query({
      materia: materia._id.toString(),
    });

  assert.equal(respuesta.status, 200);
  assert.equal(
    respuesta.body.monitores.length,
    0
  );
});
test('GET /api/busqueda/monitores/:id - rechaza perfil de monitor pendiente', async () => {
  const passwordHash =
    await generarPasswordHash('Password123');

  const monitor = await Usuario.create({
    nombre: 'Monitor Pendiente',
    correo:
      'monitor.pendiente.busqueda@urosario.edu.co',
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
    tarifaPorHora: 25000,
    modalidades: ['Virtual'],
    disponibilidadHoraria:
      'Lunes a viernes de 2:00 p. m. a 6:00 p. m.',
    estadoPerfil: 'Pendiente',
  });

  const cookie = await crearEstudiante();

  const respuesta = await request(app)
    .get(
      `/api/busqueda/monitores/${monitor._id}`
    )
    .set('Cookie', cookie);

  assert.equal(respuesta.status, 404);
  assert.equal(
    respuesta.body.error.codigo,
    'PERFIL_NO_ENCONTRADO'
  );
});