import { useState } from 'react'
import type { FormEvent } from 'react'
import MonitorLayout from '../../components/monitor/MonitorLayout/MonitorLayout'
import PageHero from '../../components/layout/PageHero/PageHero'
import Card from '../../components/shared/Card/Card'
import { useLista, request, id, nombre, dia, datos, mensajeError } from '../../services/tutoriaService'
import type { Ref } from '../../services/tutoriaService'
interface Disponibilidad { id?: string; _id?: string; fecha: string; horaInicio: string; horaFin: string; estado: string }
export default function MonitorHomePage() {
  const remote = useLista<Disponibilidad>('/disponibilidad', 'disponibilidades')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return
    const form = datos(event.currentTarget); setBusy(true); setError(''); setMessage('')
    try {
      const result = await request('/disponibilidad', 'POST', { fecha: form.fecha, horaInicio: form.inicio, horaFin: form.fin })
      setMessage(result.mensaje || 'Disponibilidad creada.'); remote.refresh()
    } catch (err) { setError(mensajeError(err)) } finally { setBusy(false) }
  }
  async function toggle(item: Disponibilidad) {
    if (busy) return; setBusy(true); setError(''); setMessage('')
    try {
      const result = await request(`/disponibilidad/${encodeURIComponent(id(item))}/estado`, 'PATCH', { estado: item.estado === 'Disponible' ? 'Bloqueada' : 'Disponible' })
      setMessage(result.mensaje || 'Estado actualizado.'); remote.refresh()
    } catch (err) { setError(mensajeError(err)) } finally { setBusy(false) }
  }
  async function remove(item: Disponibilidad) {
    if (busy) return; setBusy(true); setError(''); setMessage('')
    try {
      const result = await request(`/disponibilidad/${encodeURIComponent(id(item))}`, 'DELETE')
      setMessage(result.mensaje || 'Disponibilidad eliminada.'); remote.refresh()
    } catch (err) { setError(mensajeError(err)) } finally { setBusy(false) }
  }
  return <MonitorLayout><PageHero title="Mi disponibilidad" description="Los estudiantes solo pueden solicitar horarios publicados como disponibles." />
    {message && <p role="status">{message}</p>}{error && <p role="alert">{error}</p>}
    <Card title="Publicar horario"><form onSubmit={submit}><label>Fecha <input type="date" name="fecha" required /></label><label>Hora de inicio <input type="time" name="inicio" required /></label><label>Hora de fin <input type="time" name="fin" required /></label><button type="submit" disabled={busy}>{busy ? 'Guardando...' : 'Publicar disponibilidad'}</button></form></Card>
    {remote.loading ? <p role="status">Cargando disponibilidad...</p> : remote.error ? <div role="alert"><p>{remote.error}</p><button onClick={remote.refresh}>Reintentar</button></div> : <Card title="Horarios publicados">
      {!remote.items.length && <p>No has publicado horarios.</p>}
      {remote.items.map(d => <article key={id(d)} style={{ padding: '16px 0', borderBottom: '1px solid #ddd' }}><p>{dia(d.fecha)} · {d.horaInicio}–{d.horaFin} · {d.estado}</p><button disabled={busy} onClick={() => toggle(d)}>{d.estado === 'Disponible' ? 'Bloquear' : 'Activar'}</button><button disabled={busy} onClick={() => remove(d)}>Eliminar</button></article>)}
    </Card>}
  </MonitorLayout>
}
