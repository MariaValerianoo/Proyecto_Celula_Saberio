const express = require('express');
const HttpError = require('../utils/HttpError');
const {
  iniciarAutorizacion,
  completarAutorizacion,
} = require('../services/microsoftAutorizacion.service');

const router = express.Router();

function validarTokenAutorizacion(req) {
  const esperado = process.env.MICROSOFT_AUTORIZACION_TOKEN;
  const recibido = req.get('x-autorizacion-correo');

  if (!esperado || recibido !== esperado) {
    throw new HttpError(
      401,
      'Autorización de correo no válida.',
      'AUTORIZACION_CORREO_INVALIDA'
    );
  }
}

router.get('/autorizar', async (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  try {
    validarTokenAutorizacion(req);
    const url = await iniciarAutorizacion();
    res.status(200).json({ autorizacion: url });
  } catch (error) {
    next(error);
  }
});

router.get('/callback', async (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  res.set('Referrer-Policy', 'no-referrer');
  try {
    if (req.query.error) {
      throw new HttpError(
        400,
        'No se completó la autorización de Microsoft.',
        'AUTORIZACION_RECHAZADA'
      );
    }
    await completarAutorizacion({
      estado: req.query.state,
      codigo: req.query.code,
    });
    res.status(200).json({
      mensaje: 'Cuenta remitente autorizada correctamente.',
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
