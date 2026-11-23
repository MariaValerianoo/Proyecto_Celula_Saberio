const { EXPIRACION_SEGUNDOS } = require('./jwt');

const NOMBRE_COOKIE_SESION = 'saberio_sesion';

function obtenerOpcionesCookie() {
  const Produccion = process.env.NODE_ENV === 'production';

  return {
    httpOnly: true,
    secure: Produccion,
    sameSite: 'lax',
    path: '/',
    maxAge: EXPIRACION_SEGUNDOS * 1000,
  };
}

function establecerCookieSesion(res, token) {
  res.cookie(NOMBRE_COOKIE_SESION, token, obtenerOpcionesCookie());
}

function limpiarCookieSesion(res) {
  res.clearCookie(NOMBRE_COOKIE_SESION, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
}

module.exports = {
  NOMBRE_COOKIE_SESION,
  establecerCookieSesion,
  limpiarCookieSesion,
};