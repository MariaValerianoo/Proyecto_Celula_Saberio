import { useState } from 'react'
import type { FormEvent } from 'react'
import MonitorLayout from '../../components/monitor/MonitorLayout/MonitorLayout'
import PageHero from '../../components/layout/PageHero/PageHero'
import Card from '../../components/shared/Card/Card'
import { useLista, request, id, nombre, dia, datos, mensajeError } from '../../services/tutoriaService'
import type { Solicitud } from '../../services/tutoriaService'
export default function RequestsPage() {
  const remote = useLista<Solicitud>('/solicitudes', 'solicitudes')
  const [selected, setSelected] = useState<Solicitud | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  async function respond(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selected || busy) return
    const form = datos(event.currentTarget); setBusy(true); setError(''); setMessage('')
    try {
      const result = await request(`/solicitudes/${encodeURIComponent(id(selected))}/estado`, 'PATCH', { estado: form.estado, respuestaMonitor: form.respuesta })
      setMessage(result.mensaje || 'Respuesta guardada.'); setSelected(null); remote.refresh()
    } catch (err) { setError(mensajeError(err)) } finally { setBusy(false) }
  }
  return <MonitorLayout><PageHero title="Solicitudes" description="Solicitudes recibidas y respuestas guardadas en el servidor." />
    {message && <p role="status">{message}</p>}{error && <p role="alert">{error}</p>}
    {remote.loading ? <p role="status">Cargando solicitudes...</p> : remote.error ? <div role="alert"><p>{remote.error}</p><button onClick={remote.refresh}>Reintentar</button></div> : <Card title="Solicitudes recibidas">
      <button disabled={busy} onClick={remote.refresh}>Actualizar</button>
      {!remote.items.length && <p>No tienes solicitudes.</p>}
      {remote.items.map(s => <article key={id(s)} style={{ padding: '16px 0', borderBottom: '1px solid #ddd' }}><h3>{nombre(s.estudiante)} · {nombre(s.materia)}</h3><p>{s.tema}</p><p>{s.descripcion}</p><p>{s.modalidad} · {dia(s.fechaPreferida)} · {s.horaPreferida} · {s.duracionEstimadaHoras} horas</p><p>Estado: {s.estado}</p>{s.respuestaMonitor && <p>Tu respuesta: {s.respuestaMonitor}</p>}
        {s.estado === 'Pendiente' && <button disabled={busy} onClick={() => { setSelected(s); setError('') }}>Responder</button>}
        {s.estado === 'Aceptada' && <a href="/monitor/calendario">Ir al calendario para programar la sesión</a>}
      </article>)}
    </Card>}
    {selected && <Card title={`Responder a ${nombre(selected.estudiante)}`}><form onSubmit={respond}><label>Respuesta <select name="estado"><option>Aceptada</option><option>Rechazada</option><option>Reprogramada</option></select></label><label>Mensaje al estudiante <textarea name="respuesta" maxLength={1000} /></label><p>Aceptar no crea una sesión automáticamente. La programación se realiza desde el calendario.</p><button disabled={busy} type="submit">{busy ? 'Guardando...' : 'Guardar respuesta'}</button><button disabled={busy} type="button" onClick={() => setSelected(null)}>Cancelar</button></form></Card>}
  </MonitorLayout>
}
