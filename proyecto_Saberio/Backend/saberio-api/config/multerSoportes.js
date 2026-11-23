const multer = require('multer');
const HttpError = require('../src/utils/HttpError');
const cargar = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 4, parts: 5 },
  fileFilter(req, archivo, callback) {
    if (!['application/pdf', 'image/png', 'image/jpeg'].includes(archivo.mimetype)) return callback(new HttpError(400, 'Solo se permiten archivos PDF, PNG o JPG', 'ARCHIVO_NO_PERMITIDO'));
    callback(null, true);
  },
}).single('archivo');
module.exports = function multerSoportes(req, res, next) {
  cargar(req, res, error => {
    if (!error) return next();
    if (error instanceof multer.MulterError) return next(new HttpError(400, error.code === 'LIMIT_FILE_SIZE' ? 'El archivo no puede superar 5 MB' : 'Envía un solo archivo en el campo archivo y los datos de la materia', 'ARCHIVO_INVALIDO'));
    next(error);
  });
};
