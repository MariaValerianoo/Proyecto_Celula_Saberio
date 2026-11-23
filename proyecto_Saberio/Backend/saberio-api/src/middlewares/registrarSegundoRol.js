const Usuario = require('../../models/usuario.model');
const HttpError = require('../utils/HttpError');
const { comprobarPassword } = require('../services/password.service');
module.exports = async function registrarSegundoRol(req, res, next) {
  try {
    const { correo, password, rol } = res.locals.registro;
    const usuario = await Usuario.findOne({ correo }).select('+passwordHash');
    if (!usuario) return next();
    if (!['estudiante', 'monitor'].includes(rol)) throw new HttpError(400, 'Rol de registro inválido.', 'ROL_INVALIDO');
    if (!(await comprobarPassword(password, usuario.passwordHash))) throw new HttpError(409, 'No se pudo completar el registro. Si ya tienes cuenta, usa tu contraseña actual o recupérala.', 'REGISTRO_NO_DISPONIBLE');
    if (!usuario.correoVerificado) throw new HttpError(403, 'Verifica primero el correo de tu cuenta existente.', 'CORREO_NO_VERIFICADO');
    if (usuario.estadoCuenta !== 'habilitada') throw new HttpError(403, 'Tu cuenta no está habilitada.', 'CUENTA_NO_HABILITADA');
    const actualizado = await Usuario.findOneAndUpdate({ _id: usuario._id, passwordHash: usuario.passwordHash, correoVerificado: true, estadoCuenta: 'habilitada' }, { $addToSet: { roles: rol } }, { new: true, runValidators: true });
    if (!actualizado) throw new HttpError(409, 'La cuenta cambió. Reintenta con tus credenciales actuales.', 'CUENTA_ACTUALIZADA');
    res.status(200).json({ mensaje: `Tu cuenta ya tiene el rol ${rol}. Inicia sesión con tu correo y contraseña habituales.`, usuario: actualizado.toJSON(), verificacion: { envioSolicitado: false } });
  } catch (error) { next(error); }
};
