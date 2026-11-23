const crypto = require('node:crypto');
const { CryptoProvider } = require('@azure/msal-node');
const AutorizacionPendiente = require('../../models/autorizacionMicrosoftPendiente.model');
const {
  obtenerConfiguracionMicrosoft,
} = require('../../config/microsoft');
const {
  cifrarTexto,
  descifrarTexto,
  crearHash,
} = require('../utils/cifrado');
const microsoftSesion = require('./microsoftSesion.service');

const VIGENCIA_MS = 10 * 60 * 1000;

function crearError(mensaje, codigo) {
  const error = new Error(mensaje);
  error.codigo = codigo;
  return error;
}

async function iniciarAutorizacion() {
  const configuracion = obtenerConfiguracionMicrosoft();
  const cliente = await microsoftSesion.obtenerCliente();

  const { verifier, challenge } =
    await new CryptoProvider().generatePkceCodes();

  const estado = crypto.randomBytes(32).toString('hex');

  await AutorizacionPendiente.create({
    estadoHash: crearHash(estado),
    verificadorCifrado: cifrarTexto(verifier),
    expiraEn: new Date(Date.now() + VIGENCIA_MS),
  });

  return cliente.getAuthCodeUrl({
    scopes: configuracion.scopes,
    redirectUri: configuracion.redirectUri,
    responseMode: 'query',
    state: estado,
    codeChallenge: challenge,
    codeChallengeMethod: 'S256',
    prompt: 'select_account',
    loginHint: configuracion.remitente,
  });
}

async function completarAutorizacion({ estado, codigo }) {
  if (
    typeof estado !== 'string' ||
    !/^[a-f0-9]{64}$/.test(estado)
  ) {
    throw crearError(
      'Estado de autorización inválido.',
      'ESTADO_AUTORIZACION_INVALIDO'
    );
  }

  if (typeof codigo !== 'string' || codigo.trim().length === 0) {
    throw crearError(
      'Código de autorización ausente.',
      'CODIGO_AUTORIZACION_AUSENTE'
    );
  }

  const pendiente = await AutorizacionPendiente.findOneAndDelete({
    estadoHash: crearHash(estado),
    expiraEn: { $gt: new Date() },
  });

  if (!pendiente) {
    throw crearError(
      'La autorización venció o ya fue utilizada.',
      'AUTORIZACION_VENCIDA'
    );
  }

  const configuracion = obtenerConfiguracionMicrosoft();
  const cliente = await microsoftSesion.obtenerCliente();
  const verificador = descifrarTexto(
    pendiente.verificadorCifrado
  );

  const resultado = await cliente.acquireTokenByCode({
    code: codigo,
    scopes: configuracion.scopes,
    redirectUri: configuracion.redirectUri,
    codeVerifier: verificador,
  });

  const cuentaAutorizada =
    resultado?.account?.username?.trim().toLowerCase();

  if (cuentaAutorizada !== configuracion.remitente) {
    throw crearError(
      'La cuenta autorizada no coincide con el remitente configurado.',
      'CUENTA_REMITENTE_DISTINTA'
    );
  }

  await microsoftSesion.guardarCache();

  return {
    cuenta: cuentaAutorizada,
  };
}

module.exports = {
  iniciarAutorizacion,
  completarAutorizacion,
};
