const { Router } = require('express');
const { obtenerEstadoCorreo, verificarConfiguracionCorreo } = require('../services/correoProveedor.service');
const router = Router();
router.get('/estado', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json(obtenerEstadoCorreo());
});
router.post('/verificar', async (req, res, next) => {
  try {
    res.set('Cache-Control', 'no-store');
    res.json(await verificarConfiguracionCorreo());
  } catch (error) { next(error); }
});
module.exports = router;
