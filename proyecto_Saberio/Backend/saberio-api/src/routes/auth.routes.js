const { Router } = require('express');

const controlador = require('../controllers/auth.controller');
const validarRegistro = require('../middlewares/validarRegistro');
const validarLogin = require('../middlewares/validarLogin');
const autenticar = require('../middlewares/autenticar');
const {
  validarSolicitudRecuperacion,
  validarRestablecimientoContrasena,
} = require('../middlewares/validarRecuperacion');

const router = Router();

router.post(
  '/registro',
  validarRegistro,
  controlador.registrar
);

router.post(
  '/login',
  validarLogin,
  controlador.login
);

router.post(
  '/logout',
  controlador.logout
);

router.get(
  '/perfil',
  autenticar,
  controlador.obtenerPerfil
);

router.put(
  '/perfil',
  autenticar,
  controlador.actualizarPerfil
);

router.post(
  '/recuperar-contrasena',
  validarSolicitudRecuperacion,
  controlador.solicitarRecuperacion
);

router.post(
  '/restablecer-contrasena',
  validarRestablecimientoContrasena,
  controlador.restablecerContrasena
);

module.exports = router;