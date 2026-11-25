const jwt = require('jsonwebtoken');
const { randomUUID } = require('node:crypto');
const HttpError = require('./HttpError');
const ALGORITMO = 'HS256';
const EXPIRACION_SEGUNDOS = 60 * 60 * 8;
function obtenerSecreto() {
  const secreto = process.env.JWT_SECRETO;
  if (!secreto || secreto.length < 32) throw new HttpError(500, 'La configuración de sesión no está disponible', 'CONFIGURACION_SESION_INVALIDA');
  return secreto;
}
function generarTokenSesion(usuario) {
  return jwt.sign({ sub: usuario.id, correo: usuario.correo, roles: usuario.roles }, obtenerSecreto(), { algorithm: ALGORITMO, expiresIn: EXPIRACION_SEGUNDOS, jwtid: randomUUID() });
}
function verificarTokenSesion(token) {
  try {
    const payload = jwt.verify(token, obtenerSecreto(), { algorithms: [ALGORITMO] });
    if (!payload.sub || !Array.isArray(payload.roles)) throw new Error('Token inválido');
    return { id: payload.sub, correo: payload.correo, roles: payload.roles };
  } catch { throw new HttpError(401, 'La sesión no es válida o ha expirado', 'SESION_INVALIDA'); }
}
module.exports = { generarTokenSesion, verificarTokenSesion, EXPIRACION_SEGUNDOS };
