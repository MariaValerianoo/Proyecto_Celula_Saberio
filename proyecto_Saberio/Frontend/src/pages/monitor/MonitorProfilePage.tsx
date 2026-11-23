import { useEffect, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import MonitorLayout from '../../components/monitor/MonitorLayout/MonitorLayout'
import PageHero from '../../components/layout/PageHero/PageHero'
import Card from '../../components/shared/Card/Card'
import Button from '../../components/Button/Button'
import { useMaterias, request, id, mensajeError } from '../../services/tutoriaService'
import type { Ref } from '../../services/tutoriaService'
interface Perfil {
  id?: string; _id?: string; biografia?: string; experienciaAcademica?: string
  enfoqueEnsenanza?: string; materiasOfrecidas?: Ref[]; tarifaPorHora?: number
  modalidades?: string[]; disponibilidadHoraria?: string
}
const control: CSSProperties = { width: '100%', boxSizing: 'border-box', padding: 12, border: '1px solid #dcdbea', borderRadius: 12, font: 'inherit', background: '#fff', color: 'inherit' }
const field: CSSProperties = { display: 'grid', gap: 8 }
export default function MonitorProfilePage() {
  const navigate = useNavigate()
  const materias = useMaterias()
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [revision, setRevision] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  useEffect(() => {
    let active = true
    setLoading(true); setLoadError(''); setPerfil(null)
    request('/perfiles/monitor').then(data => {
      if (data.perfil !== null && (!data.perfil || typeof data.perfil !== 'object' || Array.isArray(data.perfil))) throw new Error('Formato de perfil no válido.')
      if (active) setPerfil(data.perfil)
    }).catch(err => { if (active) setLoadError(mensajeError(err)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [revision])
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const form = new FormData(event.currentTarget)
    setBusy(true); setError(''); setMessage('')
    const body = {
      biografia: String(form.get('biografia') || ''),
      experienciaAcademica: String(form.get('experiencia') || ''),
      enfoqueEnsenanza: String(form.get('enfoque') || ''),
      materiasOfrecidas: materias.items.filter(m => form.getAll('materias').includes(id(m))).map(id),
      tarifaPorHora: Number(form.get('tarifa')),
      modalidades: form.getAll('modalidades').map(String),
      disponibilidadHoraria: String(form.get('disponibilidad') || ''),
    }
    try {
      const result = await request('/perfiles/monitor', 'PUT', body)
      setMessage(result.mensaje || 'Perfil guardado.')
      setRevision(v => v + 1)
    } catch (err) { setError(mensajeError(err)) } finally { setBusy(false) }
  }
  return <MonitorLayout>
    <PageHero title="Mi perfil de monitor" description="Información pública que verán los estudiantes al buscar monitorías." />
    <div className="stack stack--lg">
      <div><Button variant="secondary" onClick={() => navigate('/monitor')}>Volver al panel</Button></div>
      {message && <p role="status">{message}</p>}{error && <p role="alert">{error}</p>}
      {loading || materias.loading ? <Card title="Perfil"><p role="status">Cargando perfil...</p></Card> : loadError || materias.error ? <Card title="Perfil"><p role="alert">{loadError || materias.error}</p><Button onClick={() => { setRevision(v => v + 1); materias.refresh() }}>Reintentar</Button></Card> : <Card title="Perfil">
        <form key={`${id(perfil)}-${revision}`} onSubmit={save} style={{ display: 'grid', gap: 20 }}>
          <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0, minWidth: 0, display: 'grid', gap: 20 }}>
            <label style={field}>Biografía<textarea style={control} rows={3} name="biografia" required minLength={20} maxLength={1000} defaultValue={perfil?.biografia || ''} /></label>
            <label style={field}>Experiencia académica<textarea style={control} rows={3} name="experiencia" required minLength={20} maxLength={1000} defaultValue={perfil?.experienciaAcademica || ''} /></label>
            <label style={field}>Enfoque de enseñanza<textarea style={control} rows={3} name="enfoque" required minLength={20} maxLength={1000} defaultValue={perfil?.enfoqueEnsenanza || ''} /></label>
            <label style={field}>Materias ofrecidas<select style={control} name="materias" multiple required defaultValue={(perfil?.materiasOfrecidas || []).map(id)}>{materias.items.map(m => <option key={id(m)} value={id(m)}>{m.nombre} ({m.codigo})</option>)}</select></label>
            <label style={field}>Tarifa por hora<input style={control} type="number" name="tarifa" min={0} step={0.01} defaultValue={perfil?.tarifaPorHora ?? 0} required /></label>
            <label style={field}>Modalidades<select style={control} name="modalidades" multiple required defaultValue={perfil?.modalidades || []}><option>Presencial</option><option>Virtual</option><option>Ambas</option></select></label>
            <label style={field}>Disponibilidad horaria<textarea style={control} rows={3} name="disponibilidad" required minLength={10} maxLength={500} defaultValue={perfil?.disponibilidadHoraria || ''} /></label>
            <div><Button type="submit" disabled={busy}>{busy ? 'Guardando...' : 'Guardar perfil'}</Button></div>
          </fieldset>
        </form>
      </Card>}
    </div>
  </MonitorLayout>
}
