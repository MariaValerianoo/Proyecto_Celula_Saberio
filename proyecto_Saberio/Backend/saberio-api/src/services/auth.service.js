const crypto = require('crypto');
const Usuario = require('../../models/usuario.model');
const HttpError = require('../utils/HttpError');

const {
  generarPasswordHash,
  comprobarPassword,
} = require('./password.service');

const {
  enviarCodigoRecuperacion,
} = require('./notificacion.service');

const CODIGO_RECUPERACION_EXPIRACION_MINUTOS = 15;

const MENSAJE_RECUPERACION =
  'Si el correo está registrado, recibirás un código para recuperar tu contraseña.';

function construirPerfilPublico(usuario) {
  return {
    id: usuario._id.toString(),
    nombre: usuario.nombre,
    correo: usuario.correo,
    roles: [...usuario.roles],
    correoVerificado: usuario.correoVerificado,
    estadoCuenta: usuario.estadoCuenta,
    acreditacionMonitor: usuario.acreditacionMonitor,
  };
}

function normalizarCorreoRecuperacion(correo) {
  return typeof correo === 'string'
    ? correo.trim().toLowerCase()
    : '';
}

function errorRecuperacion() {
  return new HttpError(
    400,
    'El código de recuperación no es válido o ha expirado',
    'CODIGO_RECUPERACION_INVALIDO'
  );
}

async function registrarCuenta({
  nombre,
  correo,
  password,
  rol,
}) {
  if (rol !== 'estudiante' && rol !== 'monitor') {
    throw new HttpError(
      400,
      'El rol de registro no es válido',
      'ROL_INVALIDO'
    );
  }

  await Usuario.init();

  const existe = await Usuario.exists({ correo });

  if (existe) {
    throw new HttpError(
      409,
      'No se pudo crear una cuenta nueva con estos datos. Si ya tienes una cuenta, inicia sesión.',
      'REGISTRO_NO_DISPONIBLE'
    );
  }

  const passwordHash =
    await generarPasswordHash(password);

  let usuario;

  try {
    usuario = await Usuario.create({
      nombre,
      correo,
      passwordHash,
      roles: [rol],
      correoVerificado: false,
      correoVerificadoEn: null,
      estadoCuenta: 'habilitada',
      acreditacionMonitor: 'no_solicitada',
    });
  } catch (error) {
    if (error.code === 11000) {
      throw new HttpError(
        409,
        'No se pudo crear una cuenta nueva con estos datos. Si ya tienes una cuenta, inicia sesión.',
        'REGISTRO_NO_DISPONIBLE'
      );
    }

    throw error;
  }

  return construirPerfilPublico(usuario);
}

async function iniciarSesion({
  correo,
  contrasena,
}) {
  const usuario = await Usuario.findOne({
    correo,
  }).select('+passwordHash');

  if (!usuario) {
    throw new HttpError(
      401,
      'Credenciales inválidas',
      'CREDENCIALES_INVALIDAS'
    );
  }

  const contrasenaValida =
    await comprobarPassword(
      contrasena,
      usuario.passwordHash
    );

  if (!contrasenaValida) {
    throw new HttpError(
      401,
      'Credenciales inválidas',
      'CREDENCIALES_INVALIDAS'
    );
  }

  if (!usuario.correoVerificado) {
    throw new HttpError(
      403,
      'Debes verificar tu correo institucional antes de iniciar sesión',
      'CORREO_NO_VERIFICADO'
    );
  }

  if (usuario.estadoCuenta !== 'habilitada') {
    throw new HttpError(
      403,
      'Tu cuenta no está habilitada para acceder a la plataforma',
      'CUENTA_NO_HABILITADA'
    );
  }

  return construirPerfilPublico(usuario);
}

async function obtenerPerfil(idUsuario) {
  const usuario =
    await Usuario.findById(idUsuario);

  if (!usuario) {
    throw new HttpError(
      404,
      'No se encontró la cuenta solicitada',
      'USUARIO_NO_ENCONTRADO'
    );
  }

  return construirPerfilPublico(usuario);
}

async function actualizarPerfil(
  idUsuario,
  datos
) {
  const camposPermitidos = ['nombre'];
  const actualizaciones = {};

  for (const campo of camposPermitidos) {
    if (datos[campo] !== undefined) {
      actualizaciones[campo] = datos[campo];
    }
  }

  if (
    Object.keys(actualizaciones).length === 0
  ) {
    throw new HttpError(
      400,
      'No se enviaron campos válidos para actualizar',
      'ACTUALIZACION_INVALIDA'
    );
  }

  const usuario =
    await Usuario.findByIdAndUpdate(
      idUsuario,
      actualizaciones,
      {
        new: true,
        runValidators: true,
      }
    );

  if (!usuario) {
    throw new HttpError(
      404,
      'No se encontró la cuenta solicitada',
      'USUARIO_NO_ENCONTRADO'
    );
  }

  return construirPerfilPublico(usuario);
}

async function solicitarRecuperacion({
  correo,
}) {
  const correoNormalizado =
    normalizarCorreoRecuperacion(correo);

  if (!correoNormalizado) {
    return {
      mensaje: MENSAJE_RECUPERACION,
    };
  }

  const usuario = await Usuario.findOne({
    correo: correoNormalizado,
  });

  if (!usuario) {
    return {
      mensaje: MENSAJE_RECUPERACION,
    };
  }

  const codigo = crypto
    .randomInt(100000, 1000000)
    .toString();

  const expiracion = new Date(
    Date.now() +
      CODIGO_RECUPERACION_EXPIRACION_MINUTOS *
        60 *
        1000
  );

  const codigoHash =
    await generarPasswordHash(codigo);

  usuario.recuperacionContrasena = {
    codigoHash,
    expiracion,
    utilizado: false,
  };

  await usuario.save();

  // El código se envía únicamente al correo de la cuenta.
  await enviarCodigoRecuperacion({
    destinatario: usuario.correo,
    codigo,
    venceEn: expiracion,
  });

  return {
    mensaje: MENSAJE_RECUPERACION,
  };
}

async function restablecerContrasena({
  correo,
  codigo,
  nuevaContrasena,
}) {
  const correoNormalizado =
    normalizarCorreoRecuperacion(correo);

  if (
    !correoNormalizado ||
    typeof codigo !== 'string' ||
    !/^\d{6}$/.test(codigo)
  ) {
    throw errorRecuperacion();
  }

  const usuario = await Usuario.findOne({
    correo: correoNormalizado,
  }).select(
    '+recuperacionContrasena +passwordHash'
  );

  const recuperacion =
    usuario?.recuperacionContrasena;

  if (
    !usuario ||
    !recuperacion ||
    recuperacion.utilizado ||
    !recuperacion.codigoHash ||
    !recuperacion.expiracion
  ) {
    throw errorRecuperacion();
  }

  const expiracion = new Date(
    recuperacion.expiracion
  ).getTime();

  if (
    !Number.isFinite(expiracion) ||
    expiracion <= Date.now()
  ) {
    throw errorRecuperacion();
  }

  const codigoValido =
    await comprobarPassword(
      codigo,
      recuperacion.codigoHash
    );

  if (!codigoValido) {
    throw errorRecuperacion();
  }

  const passwordHash =
    await generarPasswordHash(
      nuevaContrasena
    );

  usuario.passwordHash = passwordHash;
  usuario.recuperacionContrasena = undefined;

  await usuario.save();

  return {
    mensaje:
      'Tu contraseña fue actualizada correctamente.',
  };
}

module.exports = {
  registrarCuenta,
  iniciarSesion,
  obtenerPerfil,
  actualizarPerfil,
  solicitarRecuperacion,
  restablecerContrasena,
};