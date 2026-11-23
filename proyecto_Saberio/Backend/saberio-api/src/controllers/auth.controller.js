const servicio = require('../services/auth.service');
const {
  generarTokenSesion,
} = require('../utils/jwt');
const {
  establecerCookieSesion,
  limpiarCookieSesion,
} = require('../utils/cookies');

async function registrar(req, res) {
  const usuario = await servicio.registrarCuenta(
    res.locals.registro
  );

  res.status(201).json({
    mensaje:
      'Cuenta creada con correo pendiente de verificación. El envío del código todavía no está implementado.',
    usuario,
  });
}

async function login(req, res) {
  const usuario = await servicio.iniciarSesion(
    res.locals.login
  );

  const token = generarTokenSesion(usuario);

  establecerCookieSesion(res, token);

  res.status(200).json({
    mensaje: 'Sesión iniciada correctamente',
    usuario,
  });
}

async function logout(req, res) {
  limpiarCookieSesion(res);

  res.status(200).json({
    mensaje: 'Sesión cerrada correctamente',
  });
}

async function obtenerPerfil(req, res) {
  const usuario = await servicio.obtenerPerfil(
    req.usuario.id
  );

  res.status(200).json({
    usuario,
  });
}

async function actualizarPerfil(req, res) {
  const usuario = await servicio.actualizarPerfil(
    req.usuario.id,
    req.body
  );

  res.status(200).json({
    mensaje: 'Perfil actualizado correctamente',
    usuario,
  });
}

async function solicitarRecuperacion(req, res) {
  const resultado = await servicio.solicitarRecuperacion(
    res.locals.recuperacion
  );

  res.status(200).json(resultado);
}

async function restablecerContrasena(req, res) {
  const resultado = await servicio.restablecerContrasena(
    res.locals.restablecimiento
  );

  res.status(200).json(resultado);
}

module.exports = {
  registrar,
  login,
  logout,
  obtenerPerfil,
  actualizarPerfil,
  solicitarRecuperacion,
  restablecerContrasena,
};