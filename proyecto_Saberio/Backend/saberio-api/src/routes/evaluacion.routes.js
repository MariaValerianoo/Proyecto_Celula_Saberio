const { Router } = require('express');

const controlador = require('../controllers/evaluacion.controller');
const autenticar = require('../middlewares/autenticar');
const requerirRol = require('../middlewares/requerirRol');
const validarEvaluacion = require('../middlewares/validarEvaluacion');

const router = Router();

router.post(
  '/',
  autenticar,
  requerirRol('estudiante'),
  validarEvaluacion,
  controlador.crear
);

router.get(
  '/monitor/:id',
  autenticar,
  controlador.listarPorMonitor
);

router.get(
  '/monitor/:id/promedio',
  autenticar,
  controlador.obtenerPromedio
);

module.exports = router;