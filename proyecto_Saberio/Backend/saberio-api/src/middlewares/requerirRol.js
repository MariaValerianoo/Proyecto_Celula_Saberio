const HttpError = require('../utils/HttpError');

function requerirRol(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.usuario) {
      return next(
        new HttpError(
          401,
          'Debes iniciar sesión para acceder a este recurso',
          'SESION_REQUERIDA'
        )
      );
    }

    const tieneRolPermitido = req.usuario.roles.some((rol) =>
      rolesPermitidos.includes(rol)
    );

    if (!tieneRolPermitido) {
      return next(
        new HttpError(
          403,
          'No tienes permisos para acceder a este recurso',
          'ACCESO_DENEGADO'
        )
      );
    }

    next();
  };
}

module.exports = requerirRol;