const { Router } = require('express');

const controlador = require('../controllers/perfilEstudiante.controller');
const autenticar = require('../middlewares/autenticar');
const requerirRol = require('../middlewares/requerirRol');
const validarPerfilEstudiante = require('../middlewares/validarPerfilEstudiante');

const router = Router();

router.get(
  '/',
  autenticar,
  requerirRol('estudiante'),
  controlador.obtener
);

router.put(
  '/',
  autenticar,
  requerirRol('estudiante'),
  validarPerfilEstudiante,
  controlador.guardar
);

module.exports = router;