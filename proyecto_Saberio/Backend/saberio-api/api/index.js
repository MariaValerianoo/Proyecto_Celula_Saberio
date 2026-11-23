const app = require('../app');
const {
  conectarBaseDeDatos,
} = require('../config/db');

let conexionPromise;

function obtenerConexion() {
  if (!conexionPromise) {
    const uri = process.env.MONGO_URI?.trim();

    if (!uri) {
      return Promise.reject(
        new Error('Falta configurar MONGO_URI')
      );
    }

    conexionPromise = conectarBaseDeDatos(uri).catch(
      (error) => {
        conexionPromise = undefined;
        throw error;
      }
    );
  }

  return conexionPromise;
}

module.exports = async function manejador(req, res) {
  try {
    await obtenerConexion();
  } catch (error) {
    console.error(
      'No se pudo conectar a MongoDB Atlas.',
      {
        tipo: error?.name,
        codigo: error?.code,
      }
    );

    res.status(503).json({
      error: {
        codigo: 'BASE_DE_DATOS_NO_DISPONIBLE',
        mensaje:
          'El servicio no pudo conectarse a la base de datos.',
      },
    });

    return;
  }

  return app(req, res);
};
