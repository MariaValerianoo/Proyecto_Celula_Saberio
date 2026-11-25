require('dotenv').config({ quiet: true });
const { verificarConfiguracionCorreo } = require('../src/services/correoProveedor.service');
verificarConfiguracionCorreo().then(resultado => {
  console.log(JSON.stringify(resultado));
}).catch(error => {
  console.error(JSON.stringify({ smtpVerificado: false, codigo: error.codigo || 'DIAGNOSTICO_FALLIDO', mensaje: error.codigo ? error.message : 'No se pudo completar el diagnóstico de correo.' }));
  process.exitCode = 1;
});
