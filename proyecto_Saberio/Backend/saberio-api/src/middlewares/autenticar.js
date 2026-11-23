const Usuario = require('../../models/usuario.model');
const HttpError = require('../utils/HttpError');
const {
  NOMBRE_COOKIE_SESION,
} = require('../utils/cookies');
const {
  verificarTokenSesion,
} = require('../utils/jwt');

async function autenticar(req, res, next) {
  try {
    const token = req.cookies?.[NOMBRE_COOKIE_SESION];

    if (!token) {
      throw new HttpError(
        401,
        'Debes iniciar sesión para acceder a este recurso',
        'SESION_REQUERIDA'
      );
    }

    const datosToken = verificarTokenSesion(token);

    const usuario = await Usuario.findById(datosToken.id).select(
      'nombre correo roles correoVerificado estadoCuenta acreditacionMonitor'
    );

    if (!usuario) {
      throw new HttpError(
        401,
        'La sesión ya no es válida',
        'SESION_INVALIDA'
      );
    }

    if (!usuario.correoVerificado) {
      throw new HttpError(
        403,
        'Debes verificar tu correo institucional para acceder',
        'CORREO_NO_VERIFICADO'
      );
    }

    if (usuario.estadoCuenta !== 'habilitada') {
      throw new HttpError(
        403,
        'Tu cuenta no está habilitada para acceder a la plataforma',
        'CUENTA_NO_HABILITADA'
      );
    }

    req.usuario = {
      id: usuario._id.toString(),
      nombre: usuario.nombre,
      correo: usuario.correo,
      roles: [...usuario.roles],
      correoVerificado: usuario.correoVerificado,
      estadoCuenta: usuario.estadoCuenta,
      acreditacionMonitor: usuario.acreditacionMonitor,
    };

    next();
  } catch (error) {
    next(error);
  }
}

module.exports = autenticar;