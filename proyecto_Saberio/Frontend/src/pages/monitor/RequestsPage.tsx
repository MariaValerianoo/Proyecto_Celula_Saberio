import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import MonitorLayout from '../../components/monitor/MonitorLayout/MonitorLayout'
import PageHero from '../../components/layout/PageHero/PageHero'
import Card from '../../components/shared/Card/Card'
import Button from '../../components/Button/Button'
import { useLista, request, id, nombre, dia, datos, mensajeError } from '../../services/tutoriaService'
import type { Solicitud } from '../../services/tutoriaService'
import '../../components/shared/MonitoringControls.css'
export default function RequestsPage() {
 const remote = useLista<Solicitud>('/solicitudes','solicitudes')
 const [selected,setSelected] = useState<Solicitud|null>(null)
 const [busy,setBusy] = useState(false)
 const [error,setError] = useState('')
 const [message,setMessage] = useState('')
 async function respond(e: FormEvent<HTMLFormElement>) {
  e.preventDefault();if(!selected||busy)return
  const form=datos(e.currentTarget);setBusy(true);setError('');setMessage('')
  try {const r=await request(`/solicitudes/${encodeURIComponent(id(selected))}/estado`,'PATCH',{estado:form.estado,respuestaMonitor:form.respuesta});setMessage(r.mensaje||'Respuesta guardada.');setSelected(null);remote.refresh()}catch(e){setError(mensajeError(e))}finally{setBusy(false)}
 }
 return <MonitorLayout><PageHero title="Solicitudes" description="Consulta y responde las solicitudes de tus estudiantes."/>{message&&<p role="status">{message}</p>}{error&&<p role="alert">{error}</p>}{remote.loading?<p role="status">Cargando solicitudes...</p>:remote.error?<Card title="No pudimos cargar las solicitudes"><p role="alert">{remote.error}</p><Button onClick={remote.refresh}>Reintentar</Button></Card>:<Card title="Solicitudes recibidas"><div className="monitoring-actions"><Button variant="secondary" disabled={busy} onClick={remote.refresh}>Actualizar</Button></div>{!remote.items.length&&<p>No tienes solicitudes.</p>}{remote.items.map(s=><article className="monitoring-record" key={id(s)}><h3>{nombre(s.estudiante)} · {nombre(s.materia)}</h3><p>{s.tema}</p><p>{s.descripcion}</p><p>{s.modalidad} · {dia(s.fechaPreferida)} · {s.horaPreferida} · {s.duracionEstimadaHoras} horas</p>{s.disponibilidad&&<p>Horario solicitado: {dia(s.disponibilidad.fecha)} · {s.disponibilidad.horaInicio}–{s.disponibilidad.horaFin}</p>}<p>Estado: {s.estado}</p>{s.respuestaMonitor&&<p>Tu respuesta: {s.respuestaMonitor}</p>}<div className="monitoring-actions">{s.estado==='Pendiente'&&<Button disabled={busy} onClick={()=>{setSelected(s);setError('')}}>Responder</Button>}{s.estado==='Aceptada'&&<Link className="monitoring-link" to="/monitor/calendario">Programar en el calendario</Link>}</div></article>)}</Card>}{selected&&<Card title={`Responder a ${nombre(selected.estudiante)}`}><form className="monitoring-form" onSubmit={respond}><fieldset disabled={busy}><label>Respuesta<select name="estado"><option>Aceptada</option><option>Rechazada</option><option>Reprogramada</option></select></label><label>Mensaje al estudiante<textarea name="respuesta" maxLength={500} rows={4}/></label><p>{selected.disponibilidad?'Aceptar reserva el horario solicitado si sigue disponible.':'Esta solicitud no tiene una franja asociada.'} La sesión se programa desde el calendario.</p><div className="monitoring-actions"><Button type="submit" loading={busy} loadingText="Guardando respuesta...">Guardar respuesta</Button><Button variant="secondary" disabled={busy} onClick={()=>setSelected(null)}>Cancelar</Button></div></fieldset></form></Card>}</MonitorLayout>
}
