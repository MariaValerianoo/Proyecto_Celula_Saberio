const assert = require('node:assert/strict');


const {
  guardarSesion,
  obtenerSesion,
  obtenerCuentaAutorizada,
  estaAutorizada,
  cerrarSesion,
  generarEstado,
} = require('../src/services/microsoftSesion.service');


const PERMISO_ENVIO =
  'https://graph.microsoft.com/Mail.Send';


const cuentaValida = {
  homeAccountId: 'cuenta-ficticia-de-prueba',
  username: 'PRUEBA@OUTLOOK.COM',
};


function crearToken({
  accessToken = 'token-ficticio-sin-validez',
  expiresOn = new Date(Date.now() + 10 * 60 * 1000),
  scopes = [PERMISO_ENVIO],
} = {}) {
  return {
    accessToken,
    expiresOn,
    scopes,
  };
}


try {
  cerrarSesion();


  assert.equal(obtenerSesion(), null);
  assert.equal(estaAutorizada(), false);
  assert.equal(obtenerCuentaAutorizada(), null);


  guardarSesion({
    cuenta: cuentaValida,
    token: crearToken(),
  });


  assert.equal(estaAutorizada(), true);
  assert.equal(
    obtenerCuentaAutorizada().username,
    'prueba@outlook.com',
  );


  const sesionGuardada = obtenerSesion();


  assert.equal(
    sesionGuardada.token.scopes.length,
    1,
  );

  assert.equal(
    sesionGuardada.token.scopes[0],
    PERMISO_ENVIO,
  );


  const copia = obtenerSesion();


  copia.token.scopes.push('scope-ficticio');
  copia.token.accessToken = 'modificado';
  copia.cuenta.username = 'modificado@outlook.com';


  assert.equal(
    obtenerSesion().token.scopes.length,
    1,
  );

  assert.equal(
    obtenerSesion().token.accessToken,
    'token-ficticio-sin-validez',
  );

  assert.equal(
    obtenerSesion().cuenta.username,
    'prueba@outlook.com',
  );


  cerrarSesion();


  assert.equal(obtenerSesion(), null);
  assert.equal(estaAutorizada(), false);


  assert.throws(
    () => guardarSesion({
      cuenta: null,
      token: crearToken(),
    }),
    { codigo: 'CUENTA_MICROSOFT_INVALIDA' },
  );


  assert.throws(
    () => guardarSesion({
      cuenta: {
        homeAccountId: '',
        username: 'prueba@outlook.com',
      },
      token: crearToken(),
    }),
    { codigo: 'CUENTA_MICROSOFT_INVALIDA' },
  );


  assert.throws(
    () => guardarSesion({
      cuenta: cuentaValida,
      token: null,
    }),
    { codigo: 'TOKEN_MICROSOFT_INVALIDO' },
  );


  assert.throws(
    () => guardarSesion({
      cuenta: cuentaValida,
      token: crearToken({
        accessToken: '',
      }),
    }),
    { codigo: 'TOKEN_MICROSOFT_INVALIDO' },
  );


  assert.throws(
    () => guardarSesion({
      cuenta: cuentaValida,
      token: crearToken({
        expiresOn: new Date('fecha-invalida'),
      }),
    }),
    { codigo: 'VENCIMIENTO_MICROSOFT_INVALIDO' },
  );


  assert.throws(
    () => guardarSesion({
      cuenta: cuentaValida,
      token: crearToken({
        expiresOn: new Date(Date.now() - 1000),
      }),
    }),
    { codigo: 'TOKEN_MICROSOFT_VENCIDO' },
  );


  assert.throws(
    () => guardarSesion({
      cuenta: cuentaValida,
      token: crearToken({
        expiresOn: new Date(Date.now() + 30 * 1000),
      }),
    }),
    { codigo: 'TOKEN_MICROSOFT_VENCIDO' },
  );


  assert.equal(estaAutorizada(), false);


  guardarSesion({
    cuenta: cuentaValida,
    token: crearToken({
      scopes: ['scope-ficticio', 123, PERMISO_ENVIO],
    }),
  });


  assert.equal(
    obtenerSesion().token.scopes.length,
    2,
  );

  assert.ok(
    obtenerSesion().token.scopes.includes(
      PERMISO_ENVIO,
    ),
  );


  cerrarSesion();


  assert.match(
    generarEstado(),
    /^[a-f0-9]{64}$/,
  );


  console.log(
    'Pruebas de sesión Microsoft superadas.',
  );
} finally {
  cerrarSesion();
}