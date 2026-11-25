function horaAMinutos(hora) {
  const [horas, minutos] = String(hora || '')
    .split(':')
    .map(Number);

  if (
    Number.isNaN(horas) ||
    Number.isNaN(minutos) ||
    horas < 0 ||
    horas > 23 ||
    minutos < 0 ||
    minutos > 59
  ) {
    return null;
  }

  return horas * 60 + minutos;
}

function inicioDeHoy() {
  const fecha = new Date();
  fecha.setHours(0, 0, 0, 0);
  return fecha;
}

function esFechaFutura(fecha) {
  const fechaNormalizada = new Date(fecha);

  if (Number.isNaN(fechaNormalizada.getTime())) {
    return false;
  }

  return (
    fechaNormalizada.getTime() >=
    inicioDeHoy().getTime()
  );
}

function puedeReservarFranja(disponibilidad) {
  return (
    Boolean(disponibilidad) &&
    disponibilidad.estado === 'Disponible' &&
    esFechaFutura(disponibilidad.fecha)
  );
}

function sesionNoIniciada(fecha, hora) {
  const fechaSesion = new Date(fecha);
  const minutos = horaAMinutos(hora);

  if (
    Number.isNaN(fechaSesion.getTime()) ||
    minutos === null
  ) {
    return false;
  }

  fechaSesion.setHours(
    Math.floor(minutos / 60),
    minutos % 60,
    0,
    0
  );

  return fechaSesion.getTime() > Date.now();
}

module.exports = {
  horaAMinutos,
  inicioDeHoy,
  esFechaFutura,
  puedeReservarFranja,
  sesionNoIniciada,
};
