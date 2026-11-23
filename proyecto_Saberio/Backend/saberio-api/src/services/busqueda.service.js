const Usuario = require('../../models/usuario.model');
const Materia = require('../../models/materia.model');
const PerfilMonitor = require('../../models/perfilMonitor.model');
const Publicacion = require('../../models/publicacion.model');
const Disponibilidad = require('../../models/disponibilidad.model');
const Evaluacion = require('../../models/evaluacion.model');
const HttpError = require('../utils/HttpError');

async function buscarMonitores(filtros) {
  const {
    materia,
    modalidad,
    calificacionMinima,
    precioMaximo,
    fecha,
    hora,
    orden,
  } = filtros;

  const filtroPublicacion = {
    activa: true,
  };

  const filtroPerfil = {
    estadoPerfil: 'Aprobado',
  };

  if (materia) {
    filtroPublicacion.materia = materia;
    filtroPerfil.materiasAcreditadas = materia;
  }

  if (modalidad && modalidad !== 'Todas') {
    filtroPublicacion.modalidad = {
      $in: [modalidad, 'Ambas'],
    };
  }

  if (precioMaximo) {
    filtroPublicacion.tarifaPorHora = {
      $lte: Number(precioMaximo),
    };
  }

  const publicaciones = await Publicacion.find(
    filtroPublicacion
  )
    .populate('monitor', 'nombre')
    .populate('materia', 'nombre codigo')
    .sort({ createdAt: -1 });

  const perfilesAprobados = await PerfilMonitor.find(
    filtroPerfil
  ).select('usuario');

  const idsMonitoresAprobados = new Set(
    perfilesAprobados.map((perfil) =>
      perfil.usuario.toString()
    )
  );

  const monitoresMap = new Map();

  for (const publicacion of publicaciones) {
    const idMonitor =
      publicacion.monitor._id.toString();

    if (!idsMonitoresAprobados.has(idMonitor)) {
      continue;
    }

    if (!monitoresMap.has(idMonitor)) {
      const perfil = await PerfilMonitor.findOne({
        usuario: idMonitor,
      });

      if (!perfil) {
        continue;
      }

      const evaluacion =
        await Evaluacion.aggregate([
          {
            $match: {
              monitor:
                publicacion.monitor._id,
            },
          },
          {
            $group: {
              _id: '$monitor',
              promedio: {
                $avg: '$calificacion',
              },
              total: {
                $sum: 1,
              },
            },
          },
        ]);

      const disponibilidad =
        await Disponibilidad.find({
          monitor: idMonitor,
          estado: 'Disponible',
        }).sort({
          fecha: 1,
          horaInicio: 1,
        });

      monitoresMap.set(idMonitor, {
        monitor: publicacion.monitor,
        perfil,
        calificacion:
          evaluacion.length > 0
            ? Number(
                evaluacion[0].promedio.toFixed(
                  2
                )
              )
            : null,
        totalEvaluaciones:
          evaluacion.length > 0
            ? evaluacion[0].total
            : 0,
        disponibilidad,
        publicaciones: [],
      });
    }

    monitoresMap
      .get(idMonitor)
      .publicaciones.push(publicacion);
  }

  let resultados = Array.from(
    monitoresMap.values()
  );

  if (
    calificacionMinima &&
    Number(calificacionMinima) > 0
  ) {
    resultados = resultados.filter(
      (resultado) =>
        resultado.calificacion !== null &&
        resultado.calificacion >=
          Number(calificacionMinima)
    );
  }

  if (fecha && hora) {
    const fechaBusqueda = new Date(fecha);

    resultados = resultados.filter(
      (resultado) =>
        resultado.disponibilidad.some(
          (disponibilidad) => {
            const mismaFecha =
              new Date(
                disponibilidad.fecha
              ).toDateString() ===
              fechaBusqueda.toDateString();

            const dentroDelHorario =
              disponibilidad.horaInicio <=
                hora &&
              disponibilidad.horaFin > hora;

            return (
              mismaFecha && dentroDelHorario
            );
          }
        )
    );
  }

  if (orden === 'calificacion') {
    resultados.sort(
      (a, b) =>
        (b.calificacion || 0) -
        (a.calificacion || 0)
    );
  }

  if (orden === 'precio') {
    resultados.sort(
      (a, b) =>
        Math.min(
          ...a.publicaciones.map(
            (publicacion) =>
              publicacion.tarifaPorHora
          )
        ) -
        Math.min(
          ...b.publicaciones.map(
            (publicacion) =>
              publicacion.tarifaPorHora
          )
        )
    );
  }

  if (orden === 'disponibilidad') {
    resultados.sort(
      (a, b) =>
        b.disponibilidad.length -
        a.disponibilidad.length
    );
  }

  if (orden === 'experiencia') {
    resultados.sort(
      (a, b) =>
        b.totalEvaluaciones -
        a.totalEvaluaciones
    );
  }

  return resultados;
}

async function obtenerPerfilPublico(idMonitor) {
  const monitor = await Usuario.findById(idMonitor);

  if (
    !monitor ||
    !monitor.roles.includes('monitor')
  ) {
    throw new HttpError(
      404,
      'El monitor no existe',
      'MONITOR_NO_ENCONTRADO'
    );
  }

  const perfil = await PerfilMonitor.findOne({
    usuario: idMonitor,
  });

  if (
    !perfil ||
    perfil.estadoPerfil !== 'Aprobado'
  ) {
    throw new HttpError(
      404,
      'El monitor no tiene un perfil público',
      'PERFIL_NO_ENCONTRADO'
    );
  }

  const publicaciones = await Publicacion.find({
    monitor: idMonitor,
    activa: true,
  })
    .populate('materia', 'nombre codigo')
    .sort({ createdAt: -1 });

  const evaluacion = await Evaluacion.aggregate([
    {
      $match: {
        monitor: monitor._id,
      },
    },
    {
      $group: {
        _id: '$monitor',
        promedio: {
          $avg: '$calificacion',
        },
        total: {
          $sum: 1,
        },
      },
    },
  ]);

  const disponibilidad = await Disponibilidad.find({
    monitor: idMonitor,
    estado: 'Disponible',
  }).sort({
    fecha: 1,
    horaInicio: 1,
  });

  return {
    monitor: {
      id: monitor._id.toString(),
      nombre: monitor.nombre,
    },
    perfil,
    publicaciones,
    calificacion:
      evaluacion.length > 0
        ? Number(
            evaluacion[0].promedio.toFixed(2)
          )
        : null,
    totalEvaluaciones:
      evaluacion.length > 0
        ? evaluacion[0].total
        : 0,
    disponibilidad,
  };
}

module.exports = {
  buscarMonitores,
  obtenerPerfilPublico,
};