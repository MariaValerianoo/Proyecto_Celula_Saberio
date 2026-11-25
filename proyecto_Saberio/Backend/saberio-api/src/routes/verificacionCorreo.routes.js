const express = require('express');
const { solicitarVerificacion, confirmarVerificacion } = require('../controllers/verificacionCorreo.controller');
const registro = require('../services/registroVerificado.service');
const HttpError = require('../utils/HttpError');
const router = express.Router();
function validarCuerpo(req, campos) {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body) || Object.keys(req.body).some(c => !campos.includes(c))) throw new HttpError(400, 'Datos de verificación inválidos.', 'DATOS_VERIFICACION_INVALIDOS');
}
router.post('/registro/solicitar', async (req, res, next) => {
  try { validarCuerpo(req, ['correo']); res.json(await registro.solicitar(req.body.correo)); } catch (error) { next(error); }
});
router.post('/registro/confirmar', async (req, res, next) => {
  try { validarCuerpo(req, ['correo', 'codigo']); res.json(await registro.confirmar(req.body)); } catch (error) { next(error); }
});
router.post('/solicitar', solicitarVerificacion);
router.post('/confirmar', confirmarVerificacion);
module.exports = router;
