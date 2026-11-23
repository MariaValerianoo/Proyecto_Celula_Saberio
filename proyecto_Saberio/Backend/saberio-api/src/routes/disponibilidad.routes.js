const { Router } = require('express');

const controlador = require('../controllers/disponibilidad.controller');
const autenticar = require('../middlewares/autenticar');
const requerirRol = require('../middlewares/requerirRol');
const validarDisponibilidad = require('../middlewares/validarDisponibilidad');

const router = Router();

router.post(
  '/',
  autenticar,
  requerirRol('monitor'),
  validarDisponibilidad,
  controlador.crear
);

router.get(
  '/',
  autenticar,
  requerirRol('monitor'),
  controlador.listarPropias
);

router.get(
  '/monitor/:id',
  autenticar,
  controlador.listarDisponibles
);

router.patch(
  '/:id/estado',
  autenticar,
  requerirRol('monitor'),
  controlador.actualizarEstado
);

router.delete(
  '/:id',
  autenticar,
  requerirRol('monitor'),
  controlador.eliminar
);

module.exports = router;