const { Router } = require('express');

const controlador = require('../controllers/solicitudTutoria.controller');
const autenticar = require('../middlewares/autenticar');
const requerirRol = require('../middlewares/requerirRol');
const validarSolicitudTutoria = require('../middlewares/validarSolicitudTutoria');

const router = Router();

router.post(
  '/',
  autenticar,
  requerirRol('estudiante'),
  validarSolicitudTutoria,
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
  '/:id/estado',
  autenticar,
  requerirRol('monitor'),
  controlador.actualizarEstado
);

module.exports = router;