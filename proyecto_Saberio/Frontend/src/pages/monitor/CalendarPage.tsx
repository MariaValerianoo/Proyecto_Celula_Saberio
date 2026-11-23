import { useState } from 'react'
import type { FormEvent } from 'react'
import MonitorLayout from '../../components/monitor/MonitorLayout/MonitorLayout'
import PageHero from '../../components/layout/PageHero/PageHero'
import Card from '../../components/shared/Card/Card'
import { useLista, request, id, nombre, dia, datos, mensajeError } from '../../services/tutoriaService'
import type { Sesion, Solicitud } from '../../services/tutoriaService'
export default function CalendarPage() {
  const sessions = useLista<Sesion>('/sesiones', 'sesiones')
  const requests = useLista<Solicitud>('/solicitudes', 'solicitudes')
  const [selected, setSelected] = useState<Solicitud | null>(null)
  const [finishing, setFinishing] = useState<Sesion | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const accepted = requests.items.filter(r => r.estado === 'Aceptada' && !sessions.items.some(s => id(s.solicitud) === id(r)))
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return
    const form = datos(event.currentTarget); setBusy(true); setError(''); setMessage('')
    try {
      if (selected) {
        const result = await request('/sesiones', 'POST', { solicitud: id(selected), fecha: form.fecha, hora: form.hora, duracionHoras: Number(form.duracion), lugarOEnlace: form.lugar, notas: form.notas })
        setMessage(result.mensaje || 'Sesión creada.'); setSelected(null)
      } else if (finishing) {
        const result = await request(`/sesiones/${encodeURIComponent(id(finishing))}/finalizar`, 'PATCH', { notas: form.notas })
        setMessage(result.mensaje || 'Sesión finalizada.'); setFinishing(null)
      }
      sessions.refresh(); requests.refresh()
    } catch (err) { setError(mensajeError(err)) } finally { setBusy(false) }
  }
  const loading = sessions.loading || requests.loading
  const loadError = sessions.error || requests.error
  return <MonitorLayout><PageHero title="Calendario de sesiones" description="Programa solicitudes aceptadas y consulta tus sesiones reales." />
    {message && <p role="status">{message}</p>}{error && <p role="alert">{error}</p>}
    {loading ? <p role="status">Cargando calendario...</p> : loadError ? <div role="alert"><p>{loadError}</p><button onClick={() => { sessions.refresh(); requests.refresh() }}>Reintentar</button></div> : <>
      <Card title="Solicitudes aceptadas sin sesión">{!accepted.length && <p>No hay solicitudes pendientes de programar.</p>}{accepted.map(s => <article key={id(s)}><p>{nombre(s.estudiante)} · {nombre(s.materia)} · {dia(s.fechaPreferida)} {s.horaPreferida}</p><button disabled={busy} onClick={() => { setSelected(s); setFinishing(null); setError('') }}>Programar sesión</button></article>)}</Card>
      <Card title="Sesiones">{!sessions.items.length && <p>No tienes sesiones.</p>}{sessions.items.map(s => <article key={id(s)} style={{ padding: '16px 0', borderBottom: '1px solid #ddd' }}><h3>{nombre(s.materia)} · {nombre(s.estudiante)}</h3><p>{s.tema}</p><p>{dia(s.fecha)} · {s.hora} · {s.duracionHoras} horas · {s.modalidad}</p><p>Estado: {s.estado}</p>{s.lugarOEnlace && <p>Lugar o enlace: {s.lugarOEnlace}</p>}{s.notas && <p>Notas: {s.notas}</p>}{s.estado === 'Programada' && <button disabled={busy} onClick={() => { setFinishing(s); setSelected(null); setError('') }}>Finalizar sesión</button>}</article>)}</Card>
    </>}
    {(selected || finishing) && <Card title={selected ? 'Programar sesión' : 'Confirmar finalización'}><form key={id(selected || finishing)} onSubmit={submit}>
      {selected && <><label>Fecha <input type="date" name="fecha" defaultValue={dia(selected.fechaPreferida)} required /></label><label>Hora <input type="time" name="hora" defaultValue={selected.horaPreferida} required /></label><label>Duración en horas <input type="number" name="duracion" min={1} max={8} step={1} defaultValue={selected.duracionEstimadaHoras} required /></label><label>Lugar o enlace <input name="lugar" maxLength={300} /></label></>}
      <label>Notas <textarea name="notas" maxLength={2000} defaultValue={finishing?.notas || ''} /></label><button type="submit" disabled={busy}>{busy ? 'Guardando...' : selected ? 'Crear sesión' : 'Confirmar finalización'}</button><button type="button" disabled={busy} onClick={() => { setSelected(null); setFinishing(null) }}>Cancelar</button>
    </form></Card>}
  </MonitorLayout>
}
