const HttpError = require('../utils/HttpError');

const CAMPOS_PERMITIDOS = new Set([
  'correo',
  'contrasena',
]);

function validarLogin(req, res, next) {
  try {
    const datos = req.body;

    if (
      !datos ||
      typeof datos !== 'object' ||
      Array.isArray(datos)
    ) {
      throw new HttpError(
        400,
        'Debes enviar un objeto JSON con los datos de inicio de sesión',
        'CUERPO_INVALIDO'
      );
    }

    const contieneCamposNoPermitidos = Object.keys(datos).some(
      (campo) => !CAMPOS_PERMITIDOS.has(campo)
    );

    if (contieneCamposNoPermitidos) {
      throw new HttpError(
        400,
        'La solicitud contiene campos no permitidos',
        'CAMPOS_NO_PERMITIDOS'
      );
    }

    const { correo, contrasena } = datos;

    if (typeof correo !== 'string' || !correo.trim()) {
      throw new HttpError(
        400,
        'El correo es obligatorio',
        'CORREO_INVALIDO'
      );
    }

    const correoNormalizado = correo.trim().toLowerCase();

    const formatoCorreoValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!formatoCorreoValido.test(correoNormalizado)) {
      throw new HttpError(
        400,
        'El correo no tiene un formato válido',
        'CORREO_INVALIDO'
      );
    }

    if (typeof contrasena !== 'string' || !contrasena) {
      throw new HttpError(
        400,
        'La contraseña es obligatoria',
        'PASSWORD_INVALIDO'
      );
    }

    if (contrasena.length > 72) {
      throw new HttpError(
        400,
        'La contraseña no puede superar 72 bytes',
        'PASSWORD_DEMASIADO_LARGO'
      );
    }

    res.locals.login = {
      correo: correoNormalizado,
      contrasena,
    };

    next();
  } catch (error) {
    next(error);
  }
}

module.exports = validarLogin;