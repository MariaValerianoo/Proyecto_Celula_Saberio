const express = require('express');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');

const authRouter = require('./src/routes/auth.routes');
const rutasVerificacionCorreo = require('./src/routes/verificacionCorreo.routes');
const rutasMateria = require('./src/routes/materia.routes');
const rutasPerfilEstudiante = require('./src/routes/perfilEstudiante.routes');
const rutasPerfilMonitor = require('./src/routes/perfilMonitor.routes');
const rutasSolicitudTutoria = require('./src/routes/solicitudTutoria.routes');
const rutasSesionTutoria = require('./src/routes/sesionTutoria.routes');
const rutasEvaluacion = require('./src/routes/evaluacion.routes');
const rutasDisponibilidad = require('./src/routes/disponibilidad.routes');
const rutasPublicacion = require('./src/routes/publicacion.routes');
const rutasBusqueda = require('./src/routes/busqueda.routes');
const rutasSoporteAcademico = require('./src/routes/soporteAcademico.routes');
const rutasDocs = require('./src/routes/docs.routes');

const {
  rutaNoEncontrada,
  manejarErrores,
} = require('./src/middlewares/manejarErrores');

const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());
app.use('/api/docs', rutasDocs);

app.get('/api/salud', (req, res) => {
  const estados = {
    0: 'desconectado',
    1: 'conectado',
    2: 'conectando',
    3: 'desconectando',
  };
  res.status(200).json({
    estado: 'ok',
    servicio: 'Saberio API',
    baseDeDatos: estados[mongoose.connection.readyState] || 'desconocido',
  });
});

app.use('/api/auth', authRouter);
app.use('/api/verificacion', rutasVerificacionCorreo);
app.use('/api/materias', rutasMateria);
app.use('/api/perfiles/estudiante', rutasPerfilEstudiante);
app.use('/api/perfiles/monitor', rutasPerfilMonitor);
app.use('/api/solicitudes', rutasSolicitudTutoria);
app.use('/api/sesiones', rutasSesionTutoria);
app.use('/api/evaluaciones', rutasEvaluacion);
app.use('/api/disponibilidad', rutasDisponibilidad);
app.use('/api/publicaciones', rutasPublicacion);
app.use('/api/busqueda', rutasBusqueda);
app.use('/api/soportes', rutasSoporteAcademico);

app.use(rutaNoEncontrada);
app.use(manejarErrores);

module.exports = app;
