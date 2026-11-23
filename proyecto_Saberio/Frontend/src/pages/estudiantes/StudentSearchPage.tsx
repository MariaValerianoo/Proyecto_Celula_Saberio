import { useState } from 'react'
import type { FormEvent } from 'react'
import { useLocation } from 'react-router-dom'
import DashboardLayout from '../../components/layout/DashboardLayout/DashboardLayout'
import PageHero from '../../components/layout/PageHero/PageHero'
import Card from '../../components/shared/Card/Card'
import { useLista, request, id, nombre, datos, dia, mensajeError } from '../../services/tutoriaService'
import type { Resultado, PublicacionBusqueda } from '../../services/tutoriaService'
import './StudentSearchPage.css'
export default function StudentSearchPage() {
  const location = useLocation()
  const [search, setSearch] = useState((location.state as { query?: string } | null)?.query || '')
  const [modality, setModality] = useState('')
  const [rating, setRating] = useState('0')
  const [order, setOrder] = useState('calificacion')
  const query = new URLSearchParams({ modalidad: modality, calificacionMinima: rating, orden: order })
  const remote = useLista<Resultado>(`/busqueda/monitores?${query}`, 'monitores')
  const [selected, setSelected] = useState<{ monitor: Resultado; publicacion: PublicacionBusqueda } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const normalized = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  const term = normalized(search.trim())
  const results = remote.items.flatMap(m => m.publicaciones.filter(p => !term || normalized(`${nombre(m.monitor)} ${nombre(p.materia)} ${p.descripcion || ''}`).includes(term)).map(p => ({ monitor: m, publicacion: p })))
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selected || busy) return
    const form = datos(event.currentTarget)
    setBusy(true); setError(''); setMessage('')
    try {
      const result = await request('/solicitudes', 'POST', { monitor: id(selected.monitor.monitor), materia: id(selected.publicacion.materia), tema: form.tema, descripcion: form.descripcion, modalidad: form.modalidad, fechaPreferida: form.fecha, horaPreferida: form.hora, duracionEstimadaHoras: Number(form.duracion) })
      setSelected(null); setMessage(result.mensaje || 'Solicitud creada correctamente.')
    } catch (err) { setError(mensajeError(err)) } finally { setBusy(false) }
  }
  return <DashboardLayout role="estudiante" notifications={[]}><PageHero title="Encuentra tu monitor" description="Publicaciones y disponibilidad reales de monitores aprobados." />
    <Card title="Buscar monitorías"><label>Materia, tema o monitor <input value={search} onChange={e => setSearch(e.target.value)} /></label>
      <label>Modalidad <select value={modality} onChange={e => setModality(e.target.value)}><option value="">Todas</option><option>Presencial</option><option>Virtual</option></select></label>
      <label>Calificación mínima <select value={rating} onChange={e => setRating(e.target.value)}><option value="0">Cualquiera</option><option value="3">3</option><option value="4">4</option><option value="5">5</option></select></label>
      <label>Orden <select value={order} onChange={e => setOrder(e.target.value)}><option value="calificacion">Calificación</option><option value="precio">Precio</option><option value="disponibilidad">Disponibilidad</option><option value="experiencia">Evaluaciones</option></select></label>
    </Card>
    {message && <p role="status">{message} <a href="/estudiante/mis-monitorias">Ver mis solicitudes</a></p>}
    {error && <p role="alert">{error}</p>}
    {remote.loading ? <p role="status">Cargando monitores...</p> : remote.error ? <div role="alert"><p>{remote.error}</p><button onClick={remote.refresh}>Reintentar</button></div> : <Card title="Resultados">
      {!results.length && <p>No hay publicaciones que coincidan con estos filtros.</p>}
      {results.map(({ monitor, publicacion }) => <article key={`${id(monitor.monitor)}-${id(publicacion)}`} style={{ padding: '16px 0', borderBottom: '1px solid #ddd' }}>
        <h3>{nombre(publicacion.materia)} · {nombre(monitor.monitor)}</h3><p>{publicacion.descripcion}</p><p>{publicacion.modalidad} · Tarifa por hora: {publicacion.tarifaPorHora}</p>
        <p>{monitor.calificacion === null ? 'Sin evaluaciones' : `Calificación: ${monitor.calificacion}`} · {monitor.totalEvaluaciones} evaluaciones</p>
        <p>Disponibilidad publicada: {monitor.disponibilidad.length ? monitor.disponibilidad.map(d => `${dia(d.fecha)} ${d.horaInicio}–${d.horaFin}`).join('; ') : 'Sin horarios publicados'}</p>
        <button disabled={busy} onClick={() => { setSelected({ monitor, publicacion }); setError(''); setMessage('') }}>Solicitar monitoría</button>
      </article>)}
    </Card>}
    {selected && <Card title={`Solicitar: ${nombre(selected.publicacion.materia)}`}><p>La fecha y hora son una preferencia; el monitor debe confirmar y programar la sesión.</p><form onSubmit={submit}>
      <label>Tema <input name="tema" required minLength={5} maxLength={150} /></label>
      <label>Descripción <textarea name="descripcion" required minLength={10} maxLength={1000} /></label>
      <label>Modalidad <select name="modalidad">{(selected.publicacion.modalidad === 'Ambas' ? ['Presencial', 'Virtual'] : [selected.publicacion.modalidad]).map(m => <option key={m}>{m}</option>)}</select></label>
      <label>Fecha preferida <input type="date" name="fecha" required /></label><label>Hora preferida <input type="time" name="hora" required /></label>
      <label>Duración en horas <input type="number" name="duracion" min={1} max={8} step={1} defaultValue={1} required /></label>
      <button disabled={busy} type="submit">{busy ? 'Enviando...' : 'Enviar solicitud'}</button><button disabled={busy} type="button" onClick={() => setSelected(null)}>Cancelar</button>
    </form></Card>}
  </DashboardLayout>
}
