const { Router } = require('express');

const controlador = require('../controllers/materia.controller');
const autenticar = require('../middlewares/autenticar');
const requerirRol = require('../middlewares/requerirRol');
const {
  validarCreacionMateria,
  validarActualizacionMateria,
} = require('../middlewares/validarMateria');

const router = Router();

router.get(
  '/',
  autenticar,
  controlador.listar
);

router.get(
  '/:id',
  autenticar,
  controlador.obtener
);

router.post(
  '/',
  autenticar,
  requerirRol('admin'),
  validarCreacionMateria,
  controlador.crear
);

router.put(
  '/:id',
  autenticar,
  requerirRol('admin'),
  validarActualizacionMateria,
  controlador.actualizar
);

router.patch(
  '/:id/estado',
  autenticar,
  requerirRol('admin'),
  controlador.cambiarEstado
);

module.exports = router;