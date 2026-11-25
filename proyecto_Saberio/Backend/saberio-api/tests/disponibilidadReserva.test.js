const test = require('node:test');
const assert = require('node:assert/strict');
const {
  horaAMinutos,
  esFechaFutura,
  puedeReservarFranja,
  sesionNoIniciada,
} = require('../src/utils/eventosDisponibilidad');

function fechaFutura(dias = 1) {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + dias);
  fecha.setHours(0, 0, 0, 0);
  return fecha;
}

function fechaPasada() {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() - 1);
  fecha.setHours(0, 0, 0, 0);
  return fecha;
}

test('convierte horas válidas a minutos', () => {
  assert.equal(horaAMinutos('09:30'), 570);
  assert.equal(horaAMinutos('23:59'), 1439);
});

test('rechaza horas inválidas', () => {
  assert.equal(horaAMinutos('25:00'), null);
  assert.equal(horaAMinutos('abc'), null);
});

test('acepta fechas de hoy y futuras', () => {
  assert.equal(esFechaFutura(new Date()), true);
  assert.equal(esFechaFutura(fechaFutura()), true);
});

test('rechaza fechas pasadas', () => {
  assert.equal(esFechaFutura(fechaPasada()), false);
  assert.equal(esFechaFutura('fecha-invalida'), false);
});

test('solo permite reservar franjas disponibles y futuras', () => {
  assert.equal(
    puedeReservarFranja({
      estado: 'Disponible',
      fecha: fechaFutura(),
    }),
    true
  );

  assert.equal(
    puedeReservarFranja({
      estado: 'Reservado',
      fecha: fechaFutura(),
    }),
    false
  );

  assert.equal(
    puedeReservarFranja({
      estado: 'Disponible',
      fecha: fechaPasada(),
    }),
    false
  );

  assert.equal(puedeReservarFranja(null), false);
});

test('permite cancelar solo sesiones que no iniciaron', () => {
  const fechaFuturaSesion = fechaFutura();

  assert.equal(
    sesionNoIniciada(fechaFuturaSesion, '23:59'),
    true
  );

  const fechaPasadaSesion = fechaPasada();

  assert.equal(
    sesionNoIniciada(fechaPasadaSesion, '08:00'),
    false
  );

  assert.equal(sesionNoIniciada('fecha-invalida', '08:00'), false);
});
