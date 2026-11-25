const INICIO_JORNADA = 6;
const FIN_JORNADA = 22;
const INTERVALO_MINUTOS = 30;

function generarHorarios() {
  const horarios = [];

  for (
    let minutos = INICIO_JORNADA * 60;
    minutos <= FIN_JORNADA * 60;
    minutos += INTERVALO_MINUTOS
  ) {
    const horas = String(Math.floor(minutos / 60)).padStart(2, '0');
    const minutosTexto = String(minutos % 60).padStart(2, '0');
    horarios.push(`${horas}:${minutosTexto}`);
  }

  return horarios;
}

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

function validarRango(horaInicio, horaFin) {
  const inicio = horaAMinutos(horaInicio);
  const fin = horaAMinutos(horaFin);

  if (inicio === null || fin === null) {
    return {
      valido: false,
      mensaje: 'Selecciona una hora de inicio y una hora de fin válidas.',
    };
  }

  if (fin <= inicio) {
    return {
      valido: false,
      mensaje: 'La hora de fin debe ser posterior a la hora de inicio.',
    };
  }

  if (
    inicio < INICIO_JORNADA * 60 ||
    fin > FIN_JORNADA * 60
  ) {
    return {
      valido: false,
      mensaje: `Selecciona un horario entre ${String(INICIO_JORNADA).padStart(2, '0')}:00 y ${FIN_JORNADA}:00.`,
    };
  }

  return {
    valido: true,
    mensaje: '',
    duracionMinutos: fin - inicio,
  };
}

module.exports = {
  generarHorarios,
  horaAMinutos,
  validarRango,
};
