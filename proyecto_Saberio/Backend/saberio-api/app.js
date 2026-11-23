const express = require('express');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());
app.use('/api/docs', require('./src/routes/docs.routes'));
app.get('/api/salud', (req, res) => {
  const estados = { 0: 'desconectado', 1: 'conectado', 2: 'conectando', 3: 'desconectando' };
  res.status(200).json({ estado: 'ok', servicio: 'Saberio API', baseDeDatos: estados[mongoose.connection.readyState] || 'desconocido' });
});
app.use('/api/auth', require('./src/routes/auth.routes'));
app.use('/api/verificacion', require('./src/routes/verificacionCorreo.routes'));
app.use('/api/correo/microsoft', require('./src/routes/correoMicrosoft.routes'));
app.use('/api/materias', require('./src/routes/materia.routes'));
app.use('/api/perfiles/estudiante', require('./src/routes/perfilEstudiante.routes'));
app.use('/api/perfiles/monitor', require('./src/routes/perfilMonitor.routes'));
app.use('/api/solicitudes', require('./src/routes/solicitudTutoria.routes'));
app.use('/api/sesiones', require('./src/routes/sesionTutoria.routes'));
app.use('/api/evaluaciones', require('./src/routes/evaluacion.routes'));
app.use('/api/disponibilidad', require('./src/routes/disponibilidad.routes'));
app.use('/api/publicaciones', require('./src/routes/publicacion.routes'));
app.use('/api/busqueda', require('./src/routes/busqueda.routes'));
app.use('/api/admin', require('./src/routes/admin.routes'));
let rutasSoportes;
app.use('/api/soportes', (req, res, next) => {
  if (!rutasSoportes) {
    try {
      rutasSoportes = require('./src/routes/soporteAcademico.routes');
    } catch (error) {
      console.error('No se pudo inicializar soportes:', error.code || error.name);
      return res.status(503).json({ error: { codigo: 'SOPORTES_INICIALIZACION_FALLIDA', mensaje: 'No se pudo iniciar el almacenamiento de soportes. Revisa los logs del backend. El inicio de sesión sigue siendo independiente.' } });
    }
  }
  return rutasSoportes(req, res, next);
});
const { rutaNoEncontrada, manejarErrores } = require('./src/middlewares/manejarErrores');
app.use(rutaNoEncontrada);
app.use(manejarErrores);
module.exports = app;
