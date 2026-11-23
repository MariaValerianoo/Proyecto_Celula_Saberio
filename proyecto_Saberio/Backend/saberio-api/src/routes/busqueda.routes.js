const { Router } = require('express');

const controlador = require('../controllers/busqueda.controller');
const autenticar = require('../middlewares/autenticar');

const router = Router();

router.get(
  '/monitores',
  autenticar,
  controlador.buscarMonitores
);

router.get(
  '/monitores/:id',
  autenticar,
  controlador.obtenerPerfilPublico
);

module.exports = router;
