import { useState } from 'react'
import type { FormEvent } from 'react'
import MonitorLayout from '../../components/monitor/MonitorLayout/MonitorLayout'
import PageHero from '../../components/layout/PageHero/PageHero'
import Card from '../../components/shared/Card/Card'
import { useLista, useMaterias, request, id, nombre, datos, mensajeError } from '../../services/tutoriaService'
import type { PerfilMonitor, Ref } from '../../services/tutoriaService'
interface PerfilRespuesta { perfil: PerfilMonitor & { id?: string; _id?: string; materiasOfrecidas: Ref[] } }
export default function MonitorProfilePage() {
  const remote = useLista<PerfilRespuesta>('/perfiles/monitor', 'perfil')
  const materias = useMaterias()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const perfil = remote.items[0]?.perfil
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return
    const form = datos(event.currentTarget); setBusy(true); setError(''); setMessage('')
    const body = { biografia: form.biografia, experienciaAcademica: form.experiencia, enfoqueEnsenanza: form.enfoque, materiasOfrecidas: materias.materias.filter(m => form.getAll('materias').includes(id(m))).map(id), tarifaPorHora: Number(form.tarifa), modalidades: form.getAll('modalidades') as string[], disponibilidadHoraria: form.disponibilidad }
    try {
      const result = await request('/perfiles/monitor', 'PUT', body)
      setMessage(result.mensaje || 'Perfil guardado.'); remote.refresh()
    } catch (err) { setError(mensajeError(err)) } finally { setBusy(false) }
  }
  return <MonitorLayout><PageHero title="Mi perfil de monitor" description="Información pública que verán los estudiantes al buscar monitorías." />
    {message && <p role="status">{message}</p>}{error && <p role="alert">{error}</p>}
    {remote.loading || materias.loading ? <p role="status">Cargando perfil...</p> : remote.error || materias.error ? <div role="alert"><p>{remote.error || materias.error}</p><button onClick={() => { remote.refresh(); materias.refresh() }}>Reintentar</button></div> : <Card title="Perfil">
      <form key={id(perfil) || 'nuevo'} onSubmit={save}>
        <label>Biografía <textarea name="biografia" required minLength={20} maxLength={1000} defaultValue={perfil?.biografia || ''} /></label>
        <label>Experiencia académica <textarea name="experiencia" required minLength={20} maxLength={1000} defaultValue={perfil?.experienciaAcademica || ''} /></label>
        <label>Enfoque de enseñanza <textarea name="enfoque" required minLength={20} maxLength={1000} defaultValue={perfil?.enfoqueEnsenanza || ''} /></label>
        <label>Materias ofrecidas <select name="materias" multiple required defaultValue={(perfil?.materiasOfrecidas || []).map(id)}>{materias.materias.map(m => <option key={id(m)} value={id(m)}>{m.nombre} ({m.codigo})</option>)}</select></label>
        <label>Tarifa por hora <input type="number" name="tarifa" min={0} step={0.01} defaultValue={perfil?.tarifaPorHora ?? 0} required /></label>
        <label>Modalidades <select name="modalidades" multiple required defaultValue={perfil?.modalidades || []}><option>Presencial</option><option>Virtual</option><option>Ambas</option></select></label>
        <label>Disponibilidad horaria <textarea name="disponibilidad" required minLength={10} maxLength={500} defaultValue={perfil?.disponibilidadHoraria || ''} /></label>
        <button type="submit" disabled={busy}>{busy ? 'Guardando...' : 'Guardar perfil'}</button>
      </form>
    </Card>}
  </MonitorLayout>
}
