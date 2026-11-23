require('dotenv/config');

const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const app = require('../app');
const Usuario = require('../models/usuario.model');
const Materia = require('../models/materia.model');
const PerfilMonitor = require('../models/perfilMonitor.model');
const SoporteAcademico = require('../models/soporteAcademico.model');
const {
  generarPasswordHash,
} = require('../src/services/password.service');

const carpetaPruebas = path.join(
  process.cwd(),
  'uploads',
  'pruebas'
);

function crearArchivoPrueba(
  nombre,
  contenido
) {
  if (!fs.existsSync(carpetaPruebas)) {
    fs.mkdirSync(carpetaPruebas, {
      recursive: true,
    });
  }

  const ruta = path.join(
    carpetaPruebas,
    nombre
  );

  fs.writeFileSync(ruta, contenido);

  return ruta;
}

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

async function crearAdministrador() {
  const passwordHash = await generarPasswordHash('Password123');

  await Usuario.create({
    nombre: 'Administrador Prueba',
    correo: 'admin@urosario.edu.co',
    passwordHash,
    roles: ['admin'],
    correoVerificado: true,
    estadoCuenta: 'habilitada',
  });

  const respuesta = await request(app)
    .post('/api/auth/login')
    .send({
      correo: 'admin@urosario.edu.co',
      contrasena: 'Password123',
    });

  return respuesta.headers['set-cookie'];
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

  if (fs.existsSync(carpetaPruebas)) {
    fs.rmSync(carpetaPruebas, {
      recursive: true,
      force: true,
    });
  }
});

test.beforeEach(async () => {
  await Usuario.deleteMany({});
  await Materia.deleteMany({});
  await PerfilMonitor.deleteMany({});
  await SoporteAcademico.deleteMany({});
});

test('POST /api/soportes - carga un soporte académico en PDF', async () => {
  const { materia } =
    await crearMonitorAprobado();

  const cookie = await iniciarSesion(
    'monitor@urosario.edu.co'
  );

  const rutaArchivo = crearArchivoPrueba(
    'soporte.pdf',
    'Contenido de prueba'
  );

  const respuesta = await request(app)
    .post('/api/soportes')
    .set('Cookie', cookie)
    .field(
      'tipoDocumento',
      'Soporte académico'
    )
    .field(
      'materia',
      materia._id.toString()
    )
    .attach('archivo', rutaArchivo);

  assert.equal(respuesta.status, 201);
  assert.equal(
    respuesta.body.mensaje,
    'Soporte cargado correctamente'
  );
  assert.equal(
    respuesta.body.soporte.estado,
    'Pendiente'
  );
});

test('POST /api/soportes - carga una imagen PNG', async () => {
  const { materia } =
    await crearMonitorAprobado();

  const cookie = await iniciarSesion(
    'monitor@urosario.edu.co'
  );

  const rutaArchivo = crearArchivoPrueba(
    'soporte.png',
    'Contenido de prueba'
  );

  const respuesta = await request(app)
    .post('/api/soportes')
    .set('Cookie', cookie)
    .field(
      'tipoDocumento',
      'Soporte académico'
    )
    .field(
      'materia',
      materia._id.toString()
    )
    .attach('archivo', rutaArchivo, {
      contentType: 'image/png',
    });

  assert.equal(respuesta.status, 201);
  assert.equal(
    respuesta.body.soporte.tipoMime,
    'image/png'
  );
});

test('POST /api/soportes - carga una imagen JPG', async () => {
  const { materia } =
    await crearMonitorAprobado();

  const cookie = await iniciarSesion(
    'monitor@urosario.edu.co'
  );

  const rutaArchivo = crearArchivoPrueba(
    'soporte.jpg',
    'Contenido de prueba'
  );

  const respuesta = await request(app)
    .post('/api/soportes')
    .set('Cookie', cookie)
    .field(
      'tipoDocumento',
      'Soporte académico'
    )
    .field(
      'materia',
      materia._id.toString()
    )
    .attach('archivo', rutaArchivo, {
      contentType: 'image/jpeg',
    });

  assert.equal(respuesta.status, 201);
  assert.equal(
    respuesta.body.soporte.tipoMime,
    'image/jpeg'
  );
});

test('POST /api/soportes - rechaza un archivo no permitido', async () => {
  const { materia } =
    await crearMonitorAprobado();

  const cookie = await iniciarSesion(
    'monitor@urosario.edu.co'
  );

  const rutaArchivo = crearArchivoPrueba(
    'soporte.txt',
    'Contenido de prueba'
  );

  const respuesta = await request(app)
    .post('/api/soportes')
    .set('Cookie', cookie)
    .field(
      'tipoDocumento',
      'Soporte académico'
    )
    .field(
      'materia',
      materia._id.toString()
    )
    .attach('archivo', rutaArchivo, {
      contentType: 'text/plain',
    });

  assert.equal(respuesta.status, 400);
});

test('GET /api/soportes - lista soportes como administrador', async () => {
  const { monitor, materia } =
    await crearMonitorAprobado();

  await SoporteAcademico.create({
    monitor: monitor._id,
    materia: materia._id,
    tipoDocumento: 'Soporte académico',
    nombreOriginal: 'soporte.pdf',
    nombreArchivo: 'archivo-prueba.pdf',
    rutaArchivo: path.join(
      carpetaPruebas,
      'archivo-prueba.pdf'
    ),
    tipoMime: 'application/pdf',
    tamanoBytes: 1024,
  });

  const cookie = await crearAdministrador();

  const respuesta = await request(app)
    .get('/api/soportes')
    .set('Cookie', cookie);

  assert.equal(respuesta.status, 200);
  assert.equal(
    respuesta.body.soportes.length,
    1
  );
});

test('GET /api/soportes/propios - lista soportes del monitor', async () => {
  const { monitor, materia } =
    await crearMonitorAprobado();

  await SoporteAcademico.create({
    monitor: monitor._id,
    materia: materia._id,
    tipoDocumento: 'Soporte académico',
    nombreOriginal: 'soporte.pdf',
    nombreArchivo: 'archivo-prueba.pdf',
    rutaArchivo: path.join(
      carpetaPruebas,
      'archivo-prueba.pdf'
    ),
    tipoMime: 'application/pdf',
    tamanoBytes: 1024,
  });

  const cookie = await iniciarSesion(
    'monitor@urosario.edu.co'
  );

  const respuesta = await request(app)
    .get('/api/soportes/propios')
    .set('Cookie', cookie);

  assert.equal(respuesta.status, 200);
  assert.equal(
    respuesta.body.soportes.length,
    1
  );
});

test('PATCH /api/soportes/:id/revision - aprueba un soporte', async () => {
  const { monitor, materia } =
    await crearMonitorAprobado();

  const soporte = await SoporteAcademico.create({
    monitor: monitor._id,
    materia: materia._id,
    tipoDocumento: 'Soporte académico',
    nombreOriginal: 'soporte.pdf',
    nombreArchivo: 'archivo-prueba.pdf',
    rutaArchivo: path.join(
      carpetaPruebas,
      'archivo-prueba.pdf'
    ),
    tipoMime: 'application/pdf',
    tamanoBytes: 1024,
  });

  const cookie = await crearAdministrador();

  const respuesta = await request(app)
    .patch(
      `/api/soportes/${soporte._id}/revision`
    )
    .set('Cookie', cookie)
    .send({
      estado: 'Aprobado',
      observacionesAdmin: '',
    });

  assert.equal(respuesta.status, 200);
  assert.equal(
    respuesta.body.soporte.estado,
    'Aprobado'
  );
});

test('PATCH /api/soportes/:id/revision - rechaza un soporte sin observaciones', async () => {
  const { monitor, materia } =
    await crearMonitorAprobado();

  const soporte = await SoporteAcademico.create({
    monitor: monitor._id,
    materia: materia._id,
    tipoDocumento: 'Soporte académico',
    nombreOriginal: 'soporte.pdf',
    nombreArchivo: 'archivo-prueba.pdf',
    rutaArchivo: path.join(
      carpetaPruebas,
      'archivo-prueba.pdf'
    ),
    tipoMime: 'application/pdf',
    tamanoBytes: 1024,
  });

  const cookie = await crearAdministrador();

  const respuesta = await request(app)
    .patch(
      `/api/soportes/${soporte._id}/revision`
    )
    .set('Cookie', cookie)
    .send({
      estado: 'Rechazado',
      observacionesAdmin: '',
    });

  assert.equal(respuesta.status, 400);
  assert.equal(
    respuesta.body.error.codigo,
    'OBSERVACIONES_REQUERIDAS'
  );
});

test('DELETE /api/soportes/:id - elimina un soporte pendiente', async () => {
  const { monitor, materia } =
    await crearMonitorAprobado();

  const cookie = await iniciarSesion(
    'monitor@urosario.edu.co'
  );

  const soporte = await SoporteAcademico.create({
    monitor: monitor._id,
    materia: materia._id,
    tipoDocumento: 'Soporte académico',
    nombreOriginal: 'soporte.pdf',
    nombreArchivo: 'archivo-prueba.pdf',
    rutaArchivo: path.join(
      carpetaPruebas,
      'archivo-prueba.pdf'
    ),
    tipoMime: 'application/pdf',
    tamanoBytes: 1024,
  });

  const respuesta = await request(app)
    .delete(`/api/soportes/${soporte._id}`)
    .set('Cookie', cookie);

  assert.equal(respuesta.status, 200);
  assert.equal(
    respuesta.body.mensaje,
    'Soporte eliminado correctamente'
  );
});
test('PATCH /api/soportes/:id/revision - acredita la materia al aprobar el soporte', async () => {
  const { monitor, materia } =
    await crearMonitorAprobado();

  const soporte = await SoporteAcademico.create({
    monitor: monitor._id,
    materia: materia._id,
    tipoDocumento: 'Soporte académico',
    nombreOriginal: 'soporte.pdf',
    nombreArchivo: 'archivo-prueba.pdf',
    rutaArchivo: path.join(
      carpetaPruebas,
      'archivo-prueba.pdf'
    ),
    tipoMime: 'application/pdf',
    tamanoBytes: 1024,
  });

  const cookie = await crearAdministrador();

  const respuesta = await request(app)
    .patch(
      `/api/soportes/${soporte._id}/revision`
    )
    .set('Cookie', cookie)
    .send({
      estado: 'Aprobado',
      observacionesAdmin: '',
    });

  assert.equal(respuesta.status, 200);
  assert.equal(
    respuesta.body.soporte.estado,
    'Aprobado'
  );

  const perfil = await PerfilMonitor.findOne({
    usuario: monitor._id,
  });

  assert.deepEqual(
    perfil.materiasAcreditadas.map(String),
    [materia._id.toString()]
  );
});

test('PATCH /api/soportes/:id/revision - retira la materia al rechazar el soporte', async () => {
  const { monitor, materia } =
    await crearMonitorAprobado();

  await PerfilMonitor.updateOne(
    {
      usuario: monitor._id,
    },
    {
      $addToSet: {
        materiasAcreditadas: materia._id,
      },
    }
  );

  const soporte = await SoporteAcademico.create({
    monitor: monitor._id,
    materia: materia._id,
    tipoDocumento: 'Soporte académico',
    nombreOriginal: 'soporte.pdf',
    nombreArchivo: 'archivo-prueba.pdf',
    rutaArchivo: path.join(
      carpetaPruebas,
      'archivo-prueba.pdf'
    ),
    tipoMime: 'application/pdf',
    tamanoBytes: 1024,
  });

  const cookie = await crearAdministrador();

  const respuesta = await request(app)
    .patch(
      `/api/soportes/${soporte._id}/revision`
    )
    .set('Cookie', cookie)
    .send({
      estado: 'Rechazado',
      observacionesAdmin:
        'El documento no acredita la materia.',
    });

  assert.equal(respuesta.status, 200);
  assert.equal(
    respuesta.body.soporte.estado,
    'Rechazado'
  );

  const perfil = await PerfilMonitor.findOne({
    usuario: monitor._id,
  });

  assert.deepEqual(
    perfil.materiasAcreditadas.map(String),
    []
  );
});
test('GET /api/soportes/:id - rechaza soporte ajeno a un monitor', async () => {
  const { monitor, materia } =
    await crearMonitorAprobado();

  const passwordHash =
    await generarPasswordHash('Password123');

  const otroMonitor =
    await Usuario.create({
      nombre: 'Otro Monitor',
      correo:
        'otro.monitor@urosario.edu.co',
      passwordHash,
      roles: ['monitor'],
      correoVerificado: true,
      estadoCuenta: 'habilitada',
    });

  const soporte =
    await SoporteAcademico.create({
      monitor: monitor._id,
      materia: materia._id,
      tipoDocumento:
        'Soporte académico',
      nombreOriginal: 'soporte.pdf',
      nombreArchivo:
        'archivo-prueba.pdf',
      rutaArchivo: path.join(
        carpetaPruebas,
        'archivo-prueba.pdf'
      ),
      tipoMime: 'application/pdf',
      tamanoBytes: 1024,
    });

  const cookie = await iniciarSesion(
    'otro.monitor@urosario.edu.co'
  );

  const respuesta = await request(app)
    .get(`/api/soportes/${soporte._id}`)
    .set('Cookie', cookie);

  assert.equal(respuesta.status, 403);
  assert.equal(
    respuesta.body.error.codigo,
    'ACCESO_DENEGADO'
  );

  assert.ok(
    !respuesta.body.soporte
  );
});

test('GET /api/soportes/:id/descargar - rechaza descarga ajena a un monitor', async () => {
  const { monitor, materia } =
    await crearMonitorAprobado();

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

  const soporte =
    await SoporteAcademico.create({
      monitor: monitor._id,
      materia: materia._id,
      tipoDocumento:
        'Soporte académico',
      nombreOriginal: 'soporte.pdf',
      nombreArchivo:
        'archivo-prueba.pdf',
      rutaArchivo: path.join(
        carpetaPruebas,
        'archivo-prueba.pdf'
      ),
      tipoMime: 'application/pdf',
      tamanoBytes: 1024,
    });

  const cookie = await iniciarSesion(
    'otro.monitor@urosario.edu.co'
  );

  const respuesta = await request(app)
    .get(
      `/api/soportes/${soporte._id}/descargar`
    )
    .set('Cookie', cookie);

  assert.equal(respuesta.status, 403);
  assert.equal(
    respuesta.body.error.codigo,
    'ACCESO_DENEGADO'
  );
});

test('GET /api/soportes/:id - permite al propietario consultar su soporte', async () => {
  const { monitor, materia } =
    await crearMonitorAprobado();

  const soporte =
    await SoporteAcademico.create({
      monitor: monitor._id,
      materia: materia._id,
      tipoDocumento:
        'Soporte académico',
      nombreOriginal: 'soporte.pdf',
      nombreArchivo:
        'archivo-prueba.pdf',
      rutaArchivo: path.join(
        carpetaPruebas,
        'archivo-prueba.pdf'
      ),
      tipoMime: 'application/pdf',
      tamanoBytes: 1024,
    });

  const cookie = await iniciarSesion(
    'monitor@urosario.edu.co'
  );

  const respuesta = await request(app)
    .get(`/api/soportes/${soporte._id}`)
    .set('Cookie', cookie);

  assert.equal(respuesta.status, 200);
  assert.equal(
    respuesta.body.soporte.estado,
    'Pendiente'
  );
  assert.equal(
    respuesta.body.soporte.rutaArchivo,
    undefined
  );
  assert.equal(
    respuesta.body.soporte.nombreArchivo,
    undefined
  );
});