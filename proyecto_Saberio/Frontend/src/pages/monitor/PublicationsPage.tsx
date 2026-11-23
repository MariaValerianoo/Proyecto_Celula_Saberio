import { useState } from 'react'
import type { FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import MonitorLayout from '../../components/monitor/MonitorLayout/MonitorLayout'
import PageHero from '../../components/layout/PageHero/PageHero'
import Card from '../../components/shared/Card/Card'
import { useLista, request, id, nombre, datos, mensajeError } from '../../services/tutoriaService'
import type { Ref } from '../../services/tutoriaService'
interface Publicacion { id?: string; _id?: string; materia: Ref; descripcion: string; modalidad: string; tarifaPorHora: number; duracionMinutos: number; activa: boolean }
export default function PublicationsPage() {
  const [searchParams] = useSearchParams()
  const remote = useLista<Publicacion>('/publicaciones/propias', 'publicaciones')
  const [selected, setSelected] = useState<Publicacion | 'new' | null>(searchParams.get('nueva') === '1' ? 'new' : null)
  const [confirm, setConfirm] = useState<Publicacion | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return
    const form = datos(event.currentTarget); setBusy(true); setError(''); setMessage('')
    const body = { materia: form.materia, descripcion: form.descripcion, modalidad: form.modalidad, tarifaPorHora: Number(form.tarifa), duracionMinutos: Number(form.duracion) }
    try {
      const result = selected === 'new' ? await request('/publicaciones', 'POST', body) : await request(`/publicaciones/${encodeURIComponent(id(selected as Publicacion))}`, 'PUT', body)
      setMessage(result.mensaje || 'Publicación guardada.'); setSelected(null); remote.refresh()
    } catch (err) { setError(mensajeError(err)) } finally { setBusy(false) }
  }
  async function remove() {
    if (!confirm || busy) return; setBusy(true); setError(''); setMessage('')
    try {
      const result = await request(`/publicaciones/${encodeURIComponent(id(confirm))}`, 'DELETE')
      setMessage(result.mensaje || 'Publicación eliminada.'); setConfirm(null); remote.refresh()
    } catch (err) { setError(mensajeError(err)) } finally { setBusy(false) }
  }
  const editing = selected && selected !== 'new' ? selected as Publicacion : null
  return <MonitorLayout><PageHero title="Tus publicaciones" description="Monitorías reales visibles para los estudiantes."><button onClick={() => { setSelected('new'); setError(''); setMessage('') }}>+ Nueva publicación</button></PageHero>
    {message && <p role="status">{message}</p>}{error && <p role="alert">{error}</p>}
    {remote.loading ? <p role="status">Cargando publicaciones...</p> : remote.error ? <div role="alert"><p>{remote.error}</p><button onClick={remote.refresh}>Reintentar</button></div> : <Card title="Publicaciones">
      {!remote.items.length && <p>Aún no tienes publicaciones.</p>}
      {remote.items.map(p => <article key={id(p)} style={{ padding: '16px 0', borderBottom: '1px solid #ddd' }}><h3>{nombre(p.materia)}</h3><p>{p.descripcion}</p><p>{p.modalidad} · {p.tarifaPorHora} por hora · {p.duracionMinutos} minutos</p><p>{p.activa ? 'Activa' : 'Inactiva'}</p><button disabled={busy} onClick={() => { setSelected(p); setError('') }}>Editar</button><button disabled={busy} onClick={() => setConfirm(p)}>Eliminar</button></article>)}
    </Card>}
    {selected && <Card title={editing ? 'Editar publicación' : 'Nueva publicación'}><form key={id(editing) || 'nueva'} onSubmit={save}>
      <label>Materia <select name="materia" defaultValue={id(editing?.materia) || ''} required><option value="">Selecciona una materia</option><option value="">Las materias disponibles se cargan desde la API</option></select></label>
      <label>Descripción <textarea name="descripcion" required minLength={10} maxLength={1000} defaultValue={editing?.descripcion || ''} /></label>
      <label>Modalidad <select name="modalidad" defaultValue={editing?.modalidad || 'Presencial'}><option>Presencial</option><option>Virtual</option><option>Ambas</option></select></label>
      <label>Tarifa por hora <input type="number" name="tarifa" min={0} step={0.01} defaultValue={editing?.tarifaPorHora ?? 0} required /></label>
      <label>Duración <select name="duracion" defaultValue={editing?.duracionMinutos || 60}><option value={60}>60 minutos</option><option value={90}>90 minutos</option><option value={120}>120 minutos</option></select></label>
      <button type="submit" disabled={busy}>{busy ? 'Guardando...' : 'Guardar publicación'}</button><button type="button" disabled={busy} onClick={() => setSelected(null)}>Cancelar</button>
    </form></Card>}
    {confirm && <Card title="Eliminar publicación"><p>¿Seguro que quieres eliminar la publicación de {nombre(confirm.materia)}?</p><button disabled={busy} onClick={remove}>{busy ? 'Eliminando...' : 'Eliminar'}</button><button disabled={busy} onClick={() => setConfirm(null)}>Cancelar</button></Card>}
  </MonitorLayout>
}
