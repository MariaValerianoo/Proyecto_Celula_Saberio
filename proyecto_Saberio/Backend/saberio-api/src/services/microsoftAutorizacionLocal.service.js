const http = require('node:http');
const {
  randomBytes,
  timingSafeEqual,
} = require('node:crypto');

const { CryptoProvider } = require('@azure/msal-node');

const {
  obtenerConfiguracionMicrosoft,
  obtenerClienteMicrosoft,
  MICROSOFT_SCOPES,
} = require('../../config/microsoft');

const {
  guardarSesion,
} = require('./microsoftSesion.service');

const VIGENCIA_MS = 5 * 60 * 1000;

let enCurso = false;

function crearError(codigo) {
  const error = new Error('No se completó la autorización Microsoft.');
  error.codigo = codigo;
  return error;
}

function coincideEstado(recibido, esperado) {
  if (
    typeof recibido !== 'string' ||
    !/^[a-f0-9]{64}$/.test(recibido)
  ) {
    return false;
  }

  return timingSafeEqual(
    Buffer.from(recibido, 'hex'),
    Buffer.from(esperado, 'hex'),
  );
}

async function autorizarMicrosoftLocal() {
  if (process.env.NODE_ENV === 'production') {
    throw crearError('AUTORIZACION_LOCAL_NO_PERMITIDA');
  }

  if (enCurso) {
    throw crearError('AUTORIZACION_EN_CURSO');
  }

  enCurso = true;

  try {
    const configuracion = obtenerConfiguracionMicrosoft();
    const cliente = obtenerClienteMicrosoft();

    const { verifier, challenge } =
      await new CryptoProvider().generatePkceCodes();

    const estado = randomBytes(32).toString('hex');
    const callback = new URL(configuracion.redirectUri);
    const venceEn = Date.now() + VIGENCIA_MS;

    const enlace = await cliente.getAuthCodeUrl({
      scopes: [...MICROSOFT_SCOPES],
      redirectUri: configuracion.redirectUri,
      responseMode: 'query',
      state: estado,
      codeChallenge: challenge,
      codeChallengeMethod: 'S256',
      prompt: 'select_account',
      loginHint: configuracion.remitente,
    });

    await new Promise((resolve, reject) => {
      let utilizado = false;
      let terminado = false;
      let temporizador;
      let respuestaActiva;

      function responder(res, status, mensaje) {
        if (res.writableEnded || res.destroyed) {
          return;
        }

        res.writeHead(status, {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-store',
          'Referrer-Policy': 'no-referrer',
        });

        res.end(mensaje);
      }

      function finalizar(error) {
        if (terminado) {
          return;
        }

        terminado = true;
        clearTimeout(temporizador);

        servidor.close(() => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });

        servidor.closeIdleConnections();
      }

      const servidor = http.createServer(async (req, res) => {
        if (terminado) {
          responder(res, 410, 'La autorización ya terminó.');
          return;
        }

        let url;

        try {
          url = new URL(req.url, callback.origin);
        } catch {
          responder(res, 400, 'Solicitud inválida.');
          return;
        }

        if (
          req.method !== 'GET' ||
          url.pathname !== callback.pathname
        ) {
          responder(res, 404, 'Ruta no disponible.');
          return;
        }

        if (
          url.searchParams.getAll('state').length !== 1 ||
          !coincideEstado(url.searchParams.get('state'), estado)
        ) {
          responder(res, 400, 'Estado de autorización inválido.');
          return;
        }

        if (utilizado || Date.now() >= venceEn) {
          responder(res, 410, 'La autorización venció o ya fue utilizada.');
          return;
        }

        utilizado = true;
        respuestaActiva = res;

        try {
          if (url.searchParams.has('error')) {
            throw crearError('AUTORIZACION_RECHAZADA');
          }

          const codigo = url.searchParams.get('code');

          if (
            url.searchParams.getAll('code').length !== 1 ||
            !codigo
          ) {
            throw crearError('CODIGO_AUTORIZACION_AUSENTE');
          }

          const resultado = await cliente.acquireTokenByCode({
            code: codigo,
            scopes: [...MICROSOFT_SCOPES],
            redirectUri: configuracion.redirectUri,
            codeVerifier: verifier,
          });

          if (terminado) {
            return;
          }

          const usuario =
            resultado?.account?.username?.trim().toLowerCase();

          if (usuario !== configuracion.remitente) {
            throw crearError('CUENTA_REMITENTE_DISTINTA');
          }

          guardarSesion({
            cuenta: resultado.account,
            token: resultado,
          });

          responder(
            res,
            200,
            'Cuenta remitente autorizada. Puedes cerrar esta pestaña.',
          );

          finalizar();
        } catch (error) {
          if (terminado) {
            return;
          }

          responder(
            res,
            400,
            'No se completó la autorización. Revisa la terminal local.',
          );

          finalizar(
            crearError(error?.codigo || 'AUTORIZACION_MICROSOFT_FALLIDA'),
          );
        }
      });

      servidor.headersTimeout = 10000;
      servidor.requestTimeout = 15000;

      servidor.on('error', () => {
        finalizar(crearError('SERVIDOR_OAUTH_LOCAL_NO_DISPONIBLE'));
      });

      temporizador = setTimeout(() => {
        responder(
          respuestaActiva || { destroyed: true },
          408,
          'La autorización venció.',
        );

        finalizar(crearError('AUTORIZACION_MICROSOFT_VENCIDA'));
        servidor.closeAllConnections();
      }, VIGENCIA_MS);

      servidor.listen(
        Number(callback.port),
        'localhost',
        () => {
          console.log(
            'Abre este enlace en el navegador de este computador.',
          );
          console.log(
            'Autoriza únicamente la cuenta Outlook remitente configurada.',
          );
          console.log(enlace);
          console.log(
            'No compartas el enlace ni la dirección final del callback.',
          );
        },
      );
    });
  } finally {
    enCurso = false;
  }
}

module.exports = { autorizarMicrosoftLocal };