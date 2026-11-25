import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import MonitorLayout from '../../components/monitor/MonitorLayout/MonitorLayout'
import PageHero from '../../components/layout/PageHero/PageHero'
import Card from '../../components/shared/Card/Card'
import { useLista, request, id, nombre, dia, datos, mensajeError, cancelarSesion, crearDisponibilidad, cambiarEstadoDisponibilidad, eliminarDisponibilidad } from '../../services/tutoriaService'
import type { Sesion, Solicitud, Disponibilidad } from '../../services/tutoriaService'

const HORARIOS = Array.from({ length: 33 }, (_, indice) => {
  const minutos = 360 + indice * 30
  const horas = String(Math.floor(minutos / 60)).padStart(2, '0')
  const minutosTexto = String(minutos % 60).padStart(2, '0')
  return `${horas}:${minutosTexto}`
})

export default function CalendarPage() {
  const sessions = useLista<Sesion>('/sesiones', 'sesiones')
  const requests = useLista<Solicitud>('/solicitudes', 'solicitudes')
  const availability = useLista<Disponibilidad>('/disponibilidad', 'disponibilidades')
  const [selected, setSelected] = useState<Solicitud | null>(null)
  const [finishing, setFinishing] = useState<Sesion | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [fechaSeleccionada, setFechaSeleccionada] = useState('')
  const [horaInicio, setHoraInicio] = useState('08:00')
  const [horaFin, setHoraFin] = useState('10:00')
  const accepted = requests.items.filter(r => r.estado === 'Aceptada' && !sessions.items.some(s => id(s.solicitud) === id(r)))
  const franjasDelDia = useMemo(() => availability.items.filter(f => dia(f.fecha) === fechaSeleccionada), [availability.items, fechaSeleccionada])
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
  async function cancelar(sesion: Sesion) {
    if (busy) return
    setBusy(true); setError(''); setMessage('')
    try {
      const result = await cancelarSesion(id(sesion))
      setMessage(result.mensaje || 'Sesión cancelada.')
      sessions.refresh(); requests.refresh()
    } catch (err) { setError(mensajeError(err)) } finally { setBusy(false) }
  }
  async function crearFranja(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return
    if (!fechaSeleccionada) { setError('Selecciona una fecha para crear disponibilidad.'); return }
    if (horaFin <= horaInicio) { setError('La hora de fin debe ser posterior a la hora de inicio.'); return }
    setBusy(true); setError(''); setMessage('')
    try {
      const result = await crearDisponibilidad({ fecha: fechaSeleccionada, horaInicio, horaFin })
      setMessage(result.mensaje || 'Disponibilidad creada.')
      availability.refresh()
    } catch (err) { setError(mensajeError(err)) } finally { setBusy(false) }
  }
  async function cambiarEstado(franja: Disponibilidad, estado: 'Disponible' | 'Bloqueado') {
    if (busy) return
    setBusy(true); setError(''); setMessage('')
    try {
      const result = await cambiarEstadoDisponibilidad(id(franja), estado)
      setMessage(result.mensaje || 'Disponibilidad actualizada.')
      availability.refresh()
    } catch (err) { setError(mensajeError(err)) } finally { setBusy(false) }
  }
  async function eliminar(franja: Disponibilidad) {
    if (busy) return
    setBusy(true); setError(''); setMessage('')
    try {
      const result = await eliminarDisponibilidad(id(franja))
      setMessage(result.mensaje || 'Disponibilidad eliminada.')
      availability.refresh()
    } catch (err) { setError(mensajeError(err)) } finally { setBusy(false) }
  }
  const loading = sessions.loading || requests.loading || availability.loading
  const loadError = sessions.error || requests.error || availability.error
  return <MonitorLayout><PageHero title="Calendario de sesiones" description="Administra tu disponibilidad, programa solicitudes aceptadas y consulta tus sesiones reales." />
    {message && <p role="status">{message}</p>}{error && <p role="alert">{error}</p>}
    {loading ? <p role="status">Cargando calendario...</p> : loadError ? <div role="alert"><p>{loadError}</p><button onClick={() => { sessions.refresh(); requests.refresh(); availability.refresh() }}>Reintentar</button></div> : <>
      <Card title="Disponibilidad interactiva">
        <div style={{ display: 'grid', gap: 16 }}>
          <label>Fecha <input type="date" value={fechaSeleccionada} min={dia(new Date().toISOString())} onChange={evento => setFechaSeleccionada(evento.target.value)} required /></label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            <label>Hora de inicio <select value={horaInicio} onChange={evento => setHoraInicio(evento.target.value)}>{HORARIOS.map(hora => <option key={hora} value={hora}>{hora}</option>)}</select></label>
            <label>Hora de fin <select value={horaFin} onChange={evento => setHoraFin(evento.target.value)}>{HORARIOS.map(hora => <option key={hora} value={hora}>{hora}</option>)}</select></label>
          </div>
          <p>Crearás un bloque continuo de <strong>{horaInicio}</strong> a <strong>{horaFin}</strong>.</p>
          <button disabled={busy || !fechaSeleccionada} onClick={crearFranja as unknown as () => void}>{busy ? 'Guardando...' : 'Crear disponibilidad'}</button>
          <div>
            <h4>Franjas del día seleccionado</h4>
            {!fechaSeleccionada && <p>Selecciona una fecha para ver y administrar tus franjas.</p>}
            {fechaSeleccionada && !franjasDelDia.length && <p>No tienes franjas para esta fecha.</p>}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
              {franjasDelDia.map(franja => <button key={id(franja)} disabled={busy || franja.estado === 'Reservado'} onClick={() => cambiarEstado(franja, franja.estado === 'Disponible' ? 'Bloqueado' : 'Disponible')} style={{ padding: 12, borderRadius: 12, border: '1px solid #dcdbea', background: franja.estado === 'Disponible' ? '#e8f7ee' : franja.estado === 'Reservado' ? '#fdecea' : '#f1f0f7', cursor: franja.estado === 'Reservado' ? 'not-allowed' : 'pointer' }}>
                <strong>{franja.horaInicio}–{franja.horaFin}</strong>
                <span style={{ display: 'block' }}>{franja.estado}</span>
                {franja.estado !== 'Reservado' && <span style={{ display: 'block', marginTop: 6, fontSize: 12 }}>{franja.estado === 'Disponible' ? 'Clic para bloquear' : 'Clic para desbloquear'}</span>}
              </button>)}
            </div>
          </div>
          <div>
            <h4>Todas las franjas</h4>
            {!availability.items.length && <p>No tienes bloques de disponibilidad.</p>}
            {availability.items.map(franja => <article key={id(franja)} style={{ padding: '10px 0', borderBottom: '1px solid #ddd', display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
              <span>{dia(franja.fecha)} · {franja.horaInicio}–{franja.horaFin} · {franja.estado}</span>
              {franja.estado !== 'Reservado' && <button disabled={busy} onClick={() => eliminar(franja)}>Eliminar</button>}
            </article>)}
          </div>
        </div>
      </Card>
      <Card title="Solicitudes aceptadas sin sesión">{!accepted.length && <p>No hay solicitudes pendientes de programar.</p>}{accepted.map(s => <article key={id(s)}><p>{nombre(s.estudiante)} · {nombre(s.materia)} · {dia(s.fechaPreferida)} {s.horaPreferida}</p><button disabled={busy} onClick={() => { setSelected(s); setFinishing(null); setError('') }}>Programar sesión</button></article>)}</Card>
      <Card title="Sesiones">{!sessions.items.length && <p>No tienes sesiones.</p>}{sessions.items.map(s => <article key={id(s)} style={{ padding: '16px 0', borderBottom: '1px solid #ddd' }}><h3>{nombre(s.materia)} · {nombre(s.estudiante)}</h3><p>{s.tema}</p><p>{dia(s.fecha)} · {s.hora} · {s.duracionHoras} horas · {s.modalidad}</p><p>Estado: {s.estado}</p>{s.lugarOEnlace && <p>Lugar o enlace: {s.lugarOEnlace}</p>}{s.notas && <p>Notas: {s.notas}</p>}{s.estado === 'Programada' && <><button disabled={busy} onClick={() => { setFinishing(s); setSelected(null); setError('') }}>Finalizar sesión</button><button disabled={busy} onClick={() => cancelar(s)}>Cancelar sesión</button></>}</article>)}</Card>
    </>}
    {(selected || finishing) && <Card title={selected ? 'Programar sesión' : 'Confirmar finalización'}><form key={id(selected || finishing)} onSubmit={submit}>
      {selected && <><label>Fecha <input type="date" name="fecha" defaultValue={dia(selected.fechaPreferida)} required /></label><label>Hora <input type="time" name="hora" defaultValue={selected.horaPreferida} required /></label><label>Duración en horas <input type="number" name="duracion" min={1} max={8} step={1} defaultValue={selected.duracionEstimadaHoras} required /></label><label>Lugar o enlace <input name="lugar" maxLength={300} /></label></>}
      <label>Notas <textarea name="notas" maxLength={2000} defaultValue={finishing?.notas || ''} /></label><button type="submit" disabled={busy}>{busy ? 'Guardando...' : selected ? 'Crear sesión' : 'Confirmar finalización'}</button><button type="button" disabled={busy} onClick={() => { setSelected(null); setFinishing(null) }}>Cancelar</button>
    </form></Card>}
  </MonitorLayout>
}
