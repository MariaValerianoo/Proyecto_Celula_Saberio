const { Router } = require('express');
const Usuario = require('../../models/usuario.model');
const autenticar = require('../middlewares/autenticar');
const requerirRol = require('../middlewares/requerirRol');
const HttpError = require('../utils/HttpError');
const router = Router();
router.use(autenticar, requerirRol('admin'));
router.use('/correo', require('./diagnosticoCorreo.routes'));
router.get('/usuarios', async (req, res, next) => {
  try {
    const { pagina = '1', limite = '25', rol, buscar = '' } = req.query;
    if (typeof pagina !== 'string' || !/^[1-9]\d{0,5}$/.test(pagina) || typeof limite !== 'string' || !/^[1-9]\d?$|^100$/.test(limite) || typeof buscar !== 'string' || buscar.length > 100 || (rol !== undefined && !['estudiante', 'monitor', 'admin'].includes(rol))) {
      throw new HttpError(400, 'Filtros de usuarios inválidos.', 'FILTROS_INVALIDOS');
    }
    const filtro = {};
    if (rol) filtro.roles = rol;
    const texto = buscar.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (texto) filtro.$or = [{ nombre: { $regex: texto, $options: 'i' } }, { correo: { $regex: texto, $options: 'i' } }];
    const p = Number(pagina);
    const l = Number(limite);
    const [usuarios, total] = await Promise.all([
      Usuario.find(filtro).select('_id nombre correo roles correoVerificado estadoCuenta acreditacionMonitor createdAt').sort({ createdAt: -1, _id: -1 }).skip((p - 1) * l).limit(l).lean(),
      Usuario.countDocuments(filtro),
    ]);
    res.set('Cache-Control', 'no-store');
    res.json({ usuarios: usuarios.map(({ _id, ...usuario }) => ({ id: _id.toString(), ...usuario })), pagina: p, limite: l, total });
  } catch (error) { next(error); }
});
module.exports = router;
