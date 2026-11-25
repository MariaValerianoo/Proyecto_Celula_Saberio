const test = require('node:test');
const assert = require('node:assert/strict');
const {
  generarHorarios,
  horaAMinutos,
  validarRango,
} = require('../src/utils/horariosDisponibilidad');

test('genera horarios cada 30 minutos entre 06:00 y 22:00', () => {
  const horarios = generarHorarios();

  assert.equal(horarios[0], '06:00');
  assert.equal(horarios[1], '06:30');
  assert.equal(horarios.includes('12:00'), true);
  assert.equal(horarios[horarios.length - 1], '22:00');
  assert.equal(horarios.length, 33);
});

test('convierte horas a minutos', () => {
  assert.equal(horaAMinutos('08:30'), 510);
  assert.equal(horaAMinutos('22:00'), 1320);
  assert.equal(horaAMinutos('invalida'), null);
});

test('valida un rango continuo de disponibilidad', () => {
  const resultado = validarRango('14:00', '16:00');

  assert.equal(resultado.valido, true);
  assert.equal(resultado.duracionMinutos, 120);
});

test('rechaza rangos invalidos o fuera de jornada', () => {
  assert.equal(validarRango('16:00', '14:00').valido, false);
  assert.equal(validarRango('05:00', '08:00').valido, false);
  assert.equal(validarRango('20:00', '23:00').valido, false);
});
