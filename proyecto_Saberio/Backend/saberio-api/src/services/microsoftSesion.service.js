const { ConfidentialClientApplication } = require('@azure/msal-node');
const SesionMicrosoft = require('../../models/sesionMicrosoft.model');
const {
  obtenerConfiguracionMicrosoft,
} = require('../../config/microsoft');
const {
  cifrarTexto,
  descifrarTexto,
} = require('../utils/cifrado');

let cliente = null;

function crearError(mensaje, codigo) {
  const error = new Error(mensaje);
  error.codigo = codigo;
  return error;
}

async function obtenerCliente() {
  if (cliente) {
    return cliente;
  }

  const configuracion = obtenerConfiguracionMicrosoft();

  cliente = new ConfidentialClientApplication({
    auth: {
      clientId: configuracion.clientId,
      clientSecret: configuracion.clientSecret,
      authority:
        'https://login.microsoftonline.com/consumers',
    },
  });

  const registro = await SesionMicrosoft.findOne({
    cuenta: configuracion.remitente,
  });

  if (registro?.cacheCifrada) {
    try {
      const cache = descifrarTexto(registro.cacheCifrada);
      cliente.getTokenCache().deserialize(cache);
    } catch {
      await SesionMicrosoft.deleteOne({
        cuenta: configuracion.remitente,
      });
    }
  }

  return cliente;
}

async function guardarCache() {
  const configuracion = obtenerConfiguracionMicrosoft();
  const cache = cliente.getTokenCache().serialize();

  const cuentas = await cliente.getTokenCache().getAllAccounts();
  const cuenta = cuentas.find(
    (item) =>
      item.username?.trim().toLowerCase() ===
      configuracion.remitente
  );

  if (!cuenta) {
    throw crearError(
      'No se encontró la cuenta remitente autorizada.',
      'CUENTA_REMITENTE_NO_ENCONTRADA'
    );
  }

  await SesionMicrosoft.updateOne(
    { cuenta: configuracion.remitente },
    {
      $set: {
        cuenta: configuracion.remitente,
        homeAccountId: cuenta.homeAccountId,
        cacheCifrada: cifrarTexto(cache),
      },
    },
    { upsert: true }
  );
}

async function obtenerToken() {
  const configuracion = obtenerConfiguracionMicrosoft();
  const clienteActual = await obtenerCliente();
  const cache = clienteActual.getTokenCache();

  const cuentas = await cache.getAllAccounts();
  const cuenta = cuentas.find(
    (item) =>
      item.username?.trim().toLowerCase() ===
      configuracion.remitente
  );

  if (!cuenta) {
    throw crearError(
      'La cuenta remitente de Microsoft aún no ha sido autorizada.',
      'SESION_MICROSOFT_AUSENTE'
    );
  }

  const resultado = await clienteActual.acquireTokenSilent({
    account: cuenta,
    scopes: configuracion.scopes,
  });

  await guardarCache();

  return resultado.accessToken;
}

async function estaAutorizada() {
  const configuracion = obtenerConfiguracionMicrosoft();
  const clienteActual = await obtenerCliente();
  const cuentas = await clienteActual
    .getTokenCache()
    .getAllAccounts();

  return cuentas.some(
    (item) =>
      item.username?.trim().toLowerCase() ===
      configuracion.remitente
  );
}

module.exports = {
  obtenerCliente,
  guardarCache,
  obtenerToken,
  estaAutorizada,
};
