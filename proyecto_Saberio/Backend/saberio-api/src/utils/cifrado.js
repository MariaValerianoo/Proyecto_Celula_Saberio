const crypto = require('node:crypto');

function obtenerClave() {
  const clave = process.env.CIFRADO_CLAVE;

  if (!clave || typeof clave !== 'string' || clave.trim().length === 0) {
    throw new Error(
      'Falta la variable CIFRADO_CLAVE para proteger los datos de Microsoft.'
    );
  }

  const claveBytes = Buffer.from(clave.trim(), 'base64');

  if (claveBytes.length !== 32) {
    throw new Error(
      'CIFRADO_CLAVE debe ser una clave de 32 bytes codificada en Base64.'
    );
  }

  return claveBytes;
}

function cifrarTexto(texto) {
  if (typeof texto !== 'string' || texto.length === 0) {
    throw new Error('No es posible cifrar un valor vacío.');
  }

  const iv = crypto.randomBytes(12);
  const cifrador = crypto.createCipheriv(
    'aes-256-gcm',
    obtenerClave(),
    iv
  );

  const datosCifrados = Buffer.concat([
    cifrador.update(texto, 'utf8'),
    cifrador.final(),
  ]);
  const etiqueta = cifrador.getAuthTag();

  return [
    iv.toString('base64'),
    etiqueta.toString('base64'),
    datosCifrados.toString('base64'),
  ].join('.');
}

function descifrarTexto(valor) {
  if (typeof valor !== 'string' || valor.trim().length === 0) {
    throw new Error('El valor cifrado no es válido.');
  }

  const partes = valor.trim().split('.');

  if (partes.length !== 3) {
    throw new Error('El formato del valor cifrado no es válido.');
  }

  const iv = Buffer.from(partes[0], 'base64');
  const etiqueta = Buffer.from(partes[1], 'base64');
  const datosCifrados = Buffer.from(partes[2], 'base64');

  const descifrador = crypto.createDecipheriv(
    'aes-256-gcm',
    obtenerClave(),
    iv
  );

  descifrador.setAuthTag(etiqueta);

  return Buffer.concat([
    descifrador.update(datosCifrados),
    descifrador.final(),
  ]).toString('utf8');
}

function crearHash(valor) {
  return crypto
    .createHash('sha256')
    .update(String(valor))
    .digest('hex');
}

module.exports = {
  cifrarTexto,
  descifrarTexto,
  crearHash,
};
