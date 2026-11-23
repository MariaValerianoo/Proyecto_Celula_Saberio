const { Router } = require('express');

const controlador = require('../controllers/perfilMonitor.controller');
const autenticar = require('../middlewares/autenticar');
const requerirRol = require('../middlewares/requerirRol');
const validarPerfilMonitor = require('../middlewares/validarPerfilMonitor');

const router = Router();

router.get(
  '/',
  autenticar,
  requerirRol('monitor'),
  controlador.obtener
);

router.put(
  '/',
  autenticar,
  requerirRol('monitor'),
  validarPerfilMonitor,
  controlador.guardar
);

module.exports = router;