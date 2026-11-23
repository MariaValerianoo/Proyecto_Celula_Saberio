const jwt = require('jsonwebtoken');
const HttpError = require('./HttpError');

const ALGORITMO = 'HS256';
const EXPIRACION_SEGUNDOS = 60 * 60 * 8; // 8 horas

function obtenerSecreto() {
  const secreto = process.env.JWT_SECRETO;

  if (!secreto || secreto.length < 32) {
    throw new HttpError(
      500,
      'La configuración de sesión no está disponible',
      'CONFIGURACION_SESION_INVALIDA'
    );
  }

  return secreto;
}

function generarTokenSesion(usuario) {
  const payload = {
    sub: usuario.id,
    correo: usuario.correo,
    roles: usuario.roles,
  };

  return jwt.sign(payload, obtenerSecreto(), {
    algorithm: ALGORITMO,
    expiresIn: EXPIRACION_SEGUNDOS,
  });
}

function verificarTokenSesion(token) {
  try {
    const payload = jwt.verify(token, obtenerSecreto(), {
      algorithms: [ALGORITMO],
    });

    if (!payload.sub || !Array.isArray(payload.roles)) {
      throw new Error('Token inválido');
    }

    return {
      id: payload.sub,
      correo: payload.correo,
      roles: payload.roles,
    };
  } catch {
    throw new HttpError(
      401,
      'La sesión no es válida o ha expirado',
      'SESION_INVALIDA'
    );
  }
}

module.exports = {
  generarTokenSesion,
  verificarTokenSesion,
  EXPIRACION_SEGUNDOS,
};