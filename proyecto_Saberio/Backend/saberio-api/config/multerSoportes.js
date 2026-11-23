const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const HttpError = require('../src/utils/HttpError');

const carpetaSoportes = path.join(
  process.cwd(),
  'uploads',
  'soportes'
);

if (!fs.existsSync(carpetaSoportes)) {
  fs.mkdirSync(carpetaSoportes, {
    recursive: true,
  });
}

const TIPOS_PERMITIDOS = [
  'application/pdf',
  'image/png',
  'image/jpeg',
];

const EXTENSIONES_PERMITIDAS = {
  'application/pdf': '.pdf',
  'image/png': '.png',
  'image/jpeg': '.jpg',
};

const almacenamiento = multer.diskStorage({
  destination: function (
    req,
    archivo,
    callback
  ) {
    callback(null, carpetaSoportes);
  },

  filename: function (
    req,
    archivo,
    callback
  ) {
    const extension =
      EXTENSIONES_PERMITIDAS[
        archivo.mimetype
      ];

    const nombreSeguro = `${crypto.randomUUID()}${extension}`;

    callback(null, nombreSeguro);
  },
});

const multerBase = multer({
  storage: almacenamiento,

  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },

  fileFilter: function (
    req,
    archivo,
    callback
  ) {
    if (!TIPOS_PERMITIDOS.includes(archivo.mimetype)) {
      callback(
        new HttpError(
          400,
          'Solo se permiten archivos PDF, PNG o JPG',
          'ARCHIVO_NO_PERMITIDO'
        ),
        false
      );

      return;
    }

    callback(null, true);
  },
});

function multerSoportes(req, res, next) {
  multerBase.single('archivo')(
    req,
    res,
    function (error) {
      if (!error) {
        next();

        return;
      }

      if (
        error instanceof HttpError ||
        error.code === 'LIMIT_FILE_SIZE' ||
        error.code === 'LIMIT_UNEXPECTED_FILE'
      ) {
        next(
          new HttpError(
            400,
            error.message ||
              'El archivo no cumple las restricciones permitidas',
            error.codigo ||
              'ARCHIVO_INVALIDO'
          )
        );

        return;
      }

      next(error);
    }
  );
}

module.exports = multerSoportes;