const express = require('express');
const cors = require('cors');

const api = require('./api');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api', api);

app.use((req, res) => {
  res.status(404).json({
    mensaje: 'Ruta no encontrada',
  });
});

app.use((error, req, res, next) => {
  console.error(error);

  res.status(error?.status || 500).json({
    mensaje: error?.message || 'Error interno del servidor',
  });
});

module.exports = app;
