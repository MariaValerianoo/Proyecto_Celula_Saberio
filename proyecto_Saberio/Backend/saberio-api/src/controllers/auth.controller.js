const servicio = require('../services/auth.service');
const { generarTokenSesion } = require('../utils/jwt');
const { establecerCookieSesion, limpiarCookieSesion } = require('../utils/cookies');
async function registrar(req, res) {
  const usuario = await require('../services/registroVerificado.service').registrar(res.locals.registro);
  res.status(201).json({ mensaje: 'Cuenta creada con correo verificado. Ya puedes iniciar sesión.', usuario });
}
async function login(req, res) {
  const usuario = await servicio.iniciarSesion(res.locals.login);
  establecerCookieSesion(res, generarTokenSesion(usuario));
  res.status(200).json({ mensaje: 'Sesión iniciada correctamente', usuario });
}
async function logout(req, res) { limpiarCookieSesion(res); res.status(200).json({ mensaje: 'Sesión cerrada correctamente' }); }
async function obtenerPerfil(req, res) { res.status(200).json({ usuario: await servicio.obtenerPerfil(req.usuario.id) }); }
async function actualizarPerfil(req, res) { res.status(200).json({ mensaje: 'Perfil actualizado correctamente', usuario: await servicio.actualizarPerfil(req.usuario.id, req.body) }); }
async function solicitarRecuperacion(req, res) { res.status(200).json(await servicio.solicitarRecuperacion(res.locals.recuperacion)); }
async function restablecerContrasena(req, res) { res.status(200).json(await servicio.restablecerContrasena(res.locals.restablecimiento)); }
module.exports = { registrar, login, logout, obtenerPerfil, actualizarPerfil, solicitarRecuperacion, restablecerContrasena };
