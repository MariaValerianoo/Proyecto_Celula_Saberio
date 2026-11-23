const crypto = require('node:crypto');

const MARGEN_VENCIMIENTO_MS = 60 * 1000;

let sesion = null;

function crearError(mensaje, codigo) {
  const error = new Error(mensaje);
  error.codigo = codigo;
  return error;
}

function copiarSesion(valor) {
  return {
    cuenta: { ...valor.cuenta },
    token: {
      ...valor.token,
      expiresOn: new Date(valor.expiraEn),
      scopes: [...valor.token.scopes],
    },
    expiraEn: valor.expiraEn,
  };
}

function limpiarSesionExpirada() {
  if (
    sesion &&
    Date.now() >= sesion.expiraEn - MARGEN_VENCIMIENTO_MS
  ) {
    sesion = null;
  }
}

function guardarSesion({ cuenta, token } = {}) {
  if (
    !cuenta ||
    typeof cuenta !== 'object' ||
    typeof cuenta.homeAccountId !== 'string' ||
    !cuenta.homeAccountId.trim() ||
    typeof cuenta.username !== 'string' ||
    !cuenta.username.trim()
  ) {
    throw crearError(
      'La cuenta Microsoft no es válida.',
      'CUENTA_MICROSOFT_INVALIDA',
    );
  }

  if (
    !token ||
    typeof token !== 'object' ||
    typeof token.accessToken !== 'string' ||
    !token.accessToken.trim()
  ) {
    throw crearError(
      'El token Microsoft no es válido.',
      'TOKEN_MICROSOFT_INVALIDO',
    );
  }

  const fechaVencimiento = token.expiresOn;

  if (
    !(fechaVencimiento instanceof Date) ||
    !Number.isFinite(fechaVencimiento.getTime())
  ) {
    throw crearError(
      'El token Microsoft no tiene un vencimiento válido.',
      'VENCIMIENTO_MICROSOFT_INVALIDO',
    );
  }

  const expiraEn = fechaVencimiento.getTime();

  if (expiraEn <= Date.now() + MARGEN_VENCIMIENTO_MS) {
    throw crearError(
      'El token Microsoft está vencido o próximo a vencer.',
      'TOKEN_MICROSOFT_VENCIDO',
    );
  }

  sesion = {
    cuenta: {
      ...cuenta,
      username: cuenta.username.trim().toLowerCase(),
    },
    token: {
      accessToken: token.accessToken,
      scopes: Array.isArray(token.scopes)
        ? token.scopes.filter((scope) => typeof scope === 'string')
        : [],
    },
    expiraEn,
  };
}

function obtenerSesion() {
  limpiarSesionExpirada();

  return sesion ? copiarSesion(sesion) : null;
}

function obtenerCuentaAutorizada() {
  const actual = obtenerSesion();

  return actual ? actual.cuenta : null;
}

function estaAutorizada() {
  limpiarSesionExpirada();

  return sesion !== null;
}

function cerrarSesion() {
  sesion = null;
}

function generarEstado() {
  return crypto.randomBytes(32).toString('hex');
}

module.exports = {
  guardarSesion,
  obtenerSesion,
  obtenerCuentaAutorizada,
  estaAutorizada,
  cerrarSesion,
  generarEstado,
};