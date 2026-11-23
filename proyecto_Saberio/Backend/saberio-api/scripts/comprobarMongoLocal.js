const mongoose = require('mongoose');

const URI_LOCAL =
  'mongodb://127.0.0.1:27017/saberio_verificacion_test';

async function comprobarMongoLocal() {
  try {
    await mongoose.connect(URI_LOCAL, {
      serverSelectionTimeoutMS: 3000,
      connectTimeoutMS: 3000,
      autoCreate: false,
      autoIndex: false,
    });

    await mongoose.connection.db.admin().ping();

    console.log(
      'MongoDB local disponible para pruebas.',
    );
  } catch {
    console.error(
      'No se pudo conectar con MongoDB local en 127.0.0.1:27017.',
    );

    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

comprobarMongoLocal().catch(() => {
  console.error(
    'No se pudo finalizar la comprobación local.',
  );

  process.exitCode = 1;
});