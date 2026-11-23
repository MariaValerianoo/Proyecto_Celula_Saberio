const { Router } = require('express');

const controlador = require('../controllers/soporteAcademico.controller');
const autenticar = require('../middlewares/autenticar');
const requerirRol = require('../middlewares/requerirRol');
const validarSoporteAcademico = require('../middlewares/validarSoporteAcademico');
const multerSoportes = require('../../config/multerSoportes');

const router = Router();

router.post(
  '/',
  autenticar,
  requerirRol('monitor'),
  multerSoportes,
  validarSoporteAcademico,
  controlador.crear
);

router.get(
  '/',
  autenticar,
  requerirRol('admin'),
  controlador.listar
);

router.get(
  '/propios',
  autenticar,
  requerirRol('monitor'),
  controlador.listarPropios
);

router.get(
  '/:id',
  autenticar,
  controlador.obtenerPorId
);

router.get(
  '/:id/descargar',
  autenticar,
  controlador.descargar
);

router.patch(
  '/:id/revision',
  autenticar,
  requerirRol('admin'),
  controlador.revisar
);

router.delete(
  '/:id',
  autenticar,
  requerirRol('monitor'),
  controlador.eliminar
);

module.exports = router;