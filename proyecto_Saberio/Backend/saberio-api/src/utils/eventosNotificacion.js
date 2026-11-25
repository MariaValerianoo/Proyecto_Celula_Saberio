function solicitud(s, respuesta = false) {
  const id = String(s._id || s.id);
  const tipos = { Aceptada: ['success', 'Tu solicitud fue aceptada'], Rechazada: ['warning', 'Tu solicitud fue rechazada'], Reprogramada: ['warning', 'Tu solicitud fue reprogramada'] };
  if (respuesta && !tipos[s.estado]) return null;
  const [type, title] = respuesta ? tipos[s.estado] : ['request', 'Nueva solicitud de monitoría'];
  return { usuario: respuesta ? s.estudiante : s.monitor, evento: respuesta ? `solicitud_${id}_${s.estado}` : `solicitud_${id}_creada`, recursoTipo: 'solicitud_tutoria', recursoId: id, type, title, text: respuesta ? `El monitor respondió tu solicitud: ${s.estado}.` : 'Un estudiante te envió una solicitud de monitoría.', details: `Tema: ${s.tema || ''}\n${respuesta ? 'Respuesta: ' + (s.respuestaMonitor || 'Sin observaciones') : ''}`, href: respuesta ? '/estudiante/solicitudes' : '/monitor/solicitudes', fecha: respuesta ? s.fechaRespuesta : s.createdAt };
}
function soporte(s, usuario, revision = false) {
  const id = String(s._id || s.id);
  if (revision && !['Aprobado', 'Rechazado'].includes(s.estado)) return null;
  const aprobado = s.estado === 'Aprobado';
  return { usuario, evento: revision ? `revision_${id}_${s.estado}` : `carga_${id}`, recursoTipo: 'soporte_academico', recursoId: id, type: revision ? (aprobado ? 'success' : 'warning') : 'request', title: revision ? (aprobado ? 'Soporte aprobado' : 'Soporte rechazado') : 'Nuevo soporte académico', text: revision ? (aprobado ? 'Tu soporte fue aprobado. Puedes publicar esta materia.' : 'Tu soporte fue rechazado. Revisa las observaciones.') : 'Un monitor cargó un soporte académico.', details: revision ? `Resultado: ${s.estado}\nObservaciones: ${s.observacionesAdmin || 'Sin observaciones'}` : `Documento: ${s.tipoDocumento || 'Soporte académico'}`, href: revision ? (aprobado ? '/monitor/publicaciones?nueva=1' : '/monitor/perfil') : '/admin/soportes', fecha: revision ? (s.fechaRevision || s.updatedAt) : s.createdAt };
}
module.exports = { solicitud, soporte };
