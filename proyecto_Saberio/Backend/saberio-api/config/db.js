const mongoose = require('mongoose');

mongoose.set('bufferCommands', false);

let conexionPromise;

async function conectarBaseDeDatos(uri) {
  if (!conexionPromise) {
    conexionPromise = mongoose
      .connect(uri, {
        dbName: 'saberio',
        serverSelectionTimeoutMS: 10000,
      })
      .catch((error) => {
        conexionPromise = undefined;
        throw error;
      });
  }

  await conexionPromise;

  return mongoose.connection;
}

module.exports = {
  conectarBaseDeDatos,
};
