const HttpError = require('../utils/HttpError');

const CAMPOS_SOLICITUD = new Set([
  'correo',
]);

const CAMPOS_RESTABLECIMIENTO = new Set([
  'correo',
  'codigo',
  'nuevaContrasena',
  'confirmacionContrasena',
]);

function validarCuerpo(datos, camposPermitidos, mensaje) {
  if (
    !datos ||
    typeof datos !== 'object' ||
    Array.isArray(datos)
  ) {
    throw new HttpError(
      400,
      mensaje,
      'CUERPO_INVALIDO'
    );
  }

  const contieneCamposNoPermitidos = Object.keys(datos).some(
    (campo) => !camposPermitidos.has(campo)
  );

  if (contieneCamposNoPermitidos) {
    throw new HttpError(
      400,
      'La solicitud contiene campos no permitidos',
      'CAMPOS_NO_PERMITIDOS'
    );
  }
}

function validarCorreo(correo) {
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

  return correoNormalizado;
}

function validarSolicitudRecuperacion(req, res, next) {
  try {
    validarCuerpo(
      req.body,
      CAMPOS_SOLICITUD,
      'Debes enviar un objeto JSON con el correo para recuperar la contraseña'
    );

    const correo = validarCorreo(req.body.correo);

    res.locals.recuperacion = {
      correo,
    };

    next();
  } catch (error) {
    next(error);
  }
}

function validarContrasena(contrasena) {
  if (typeof contrasena !== 'string') {
    throw new HttpError(
      400,
      'La nueva contraseña es obligatoria',
      'PASSWORD_INVALIDO'
    );
  }

  if (
    contrasena.length < 8 ||
    !/[A-Z]/.test(contrasena) ||
    !/[0-9]/.test(contrasena)
  ) {
    throw new HttpError(
      400,
      'La nueva contraseña debe tener al menos 8 caracteres, una mayúscula y un número',
      'PASSWORD_INVALIDO'
    );
  }

  if (Buffer.byteLength(contrasena, 'utf8') > 72) {
    throw new HttpError(
      400,
      'La nueva contraseña no puede superar 72 bytes',
      'PASSWORD_DEMASIADO_LARGO'
    );
  }
}

function validarRestablecimientoContrasena(req, res, next) {
  try {
    validarCuerpo(
      req.body,
      CAMPOS_RESTABLECIMIENTO,
      'Debes enviar un objeto JSON con los datos para restablecer la contraseña'
    );

    const { correo, codigo, nuevaContrasena, confirmacionContrasena } =
      req.body;

    const correoNormalizado = validarCorreo(correo);

    if (typeof codigo !== 'string' || !codigo.trim()) {
      throw new HttpError(
        400,
        'El código de recuperación es obligatorio',
        'CODIGO_RECUPERACION_INVALIDO'
      );
    }

    const codigoNormalizado = codigo.trim();

    if (!/^\d{6}$/.test(codigoNormalizado)) {
      throw new HttpError(
        400,
        'El código de recuperación debe tener 6 dígitos',
        'CODIGO_RECUPERACION_INVALIDO'
      );
    }

    validarContrasena(nuevaContrasena);

    if (nuevaContrasena !== confirmacionContrasena) {
      throw new HttpError(
        400,
        'La nueva contraseña y su confirmación no coinciden',
        'CONFIRMACION_PASSWORD_INVALIDA'
      );
    }

    res.locals.restablecimiento = {
      correo: correoNormalizado,
      codigo: codigoNormalizado,
      nuevaContrasena,
    };

    next();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  validarSolicitudRecuperacion,
  validarRestablecimientoContrasena,
};