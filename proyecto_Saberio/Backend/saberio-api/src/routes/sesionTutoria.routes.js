const { Router } = require('express');

const controlador = require('../controllers/sesionTutoria.controller');
const autenticar = require('../middlewares/autenticar');
const requerirRol = require('../middlewares/requerirRol');
const validarSesionTutoria = require('../middlewares/validarSesionTutoria');

const router = Router();

router.post(
  '/',
  autenticar,
  requerirRol('monitor'),
  validarSesionTutoria,
  controlador.crear
);

router.get(
  '/',
  autenticar,
  controlador.listar
);

router.get(
  '/:id',
  autenticar,
  controlador.obtenerPorId
);

router.patch(
  '/:id/finalizar',
  autenticar,
  requerirRol('monitor'),
  controlador.finalizar
);

module.exports = router;