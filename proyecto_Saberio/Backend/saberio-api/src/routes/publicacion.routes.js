const { Router } = require('express');

const controlador = require('../controllers/publicacion.controller');
const autenticar = require('../middlewares/autenticar');
const requerirRol = require('../middlewares/requerirRol');
const validarPublicacion = require('../middlewares/validarPublicacion');

const router = Router();

router.post(
  '/',
  autenticar,
  requerirRol('monitor'),
  validarPublicacion,
  controlador.crear
);

router.get(
  '/',
  autenticar,
  controlador.listarActivas
);

router.get(
  '/propias',
  autenticar,
  requerirRol('monitor'),
  controlador.listarPropias
);

router.get(
  '/:id',
  autenticar,
  controlador.obtenerPorId
);

router.put(
  '/:id',
  autenticar,
  requerirRol('monitor'),
  validarPublicacion,
  controlador.actualizar
);

router.patch(
  '/:id/estado',
  autenticar,
  requerirRol('monitor'),
  controlador.cambiarEstado
);

router.delete(
  '/:id',
  autenticar,
  requerirRol('monitor'),
  controlador.eliminar
);

module.exports = router;