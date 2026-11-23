import { useEffect, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError, getSession } from '../../services/authService'
import MonitorLayout from '../../components/monitor/MonitorLayout/MonitorLayout'
import PageHero from '../../components/layout/PageHero/PageHero'
import Card from '../../components/shared/Card/Card'
import Button from '../../components/Button/Button'
import SoportesMateria from '../../components/monitor/SoportesMateria'
import { useMaterias, request, id, mensajeError } from '../../services/tutoriaService'
import type { Ref } from '../../services/tutoriaService'
interface Perfil {
  id?: string; _id?: string; biografia?: string; experienciaAcademica?: string
  enfoqueEnsenanza?: string; materiasOfrecidas?: Ref[]; tarifaPorHora?: number
  modalidades?: string[]; disponibilidadHoraria?: string
}
export function perfilCompleto(value: unknown): value is Perfil {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const p = value as Perfil
  const text = (v: unknown, min: number, max: number) => typeof v === 'string' && v.trim().length >= min && v.trim().length <= max
  return text(p.biografia, 20, 1000) && text(p.experienciaAcademica, 20, 1000) && text(p.enfoqueEnsenanza, 20, 1000) && Array.isArray(p.materiasOfrecidas) && p.materiasOfrecidas.length > 0 && p.materiasOfrecidas.every(m => !!id(m)) && typeof p.tarifaPorHora === 'number' && Number.isFinite(p.tarifaPorHora) && p.tarifaPorHora >= 0 && p.tarifaPorHora <= 1000000 && Array.isArray(p.modalidades) && p.modalidades.length > 0 && p.modalidades.every(m => ['Presencial', 'Virtual', 'Ambas'].includes(m)) && text(p.disponibilidadHoraria, 10, 500)
}
const control: CSSProperties = { width: '100%', boxSizing: 'border-box', padding: 12, border: '1px solid #dcdbea', borderRadius: 12, font: 'inherit', background: '#fff', color: 'inherit' }
const field: CSSProperties = { display: 'grid', gap: 8 }
export default function MonitorProfilePage({ initial = false, onSaved }: { initial?: boolean; onSaved?: () => void } = {}) {
  const navigate = useNavigate()
  const materias = useMaterias()
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [revision, setRevision] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  useEffect(() => {
    let active = true
    setLoading(true); setLoadError(''); setPerfil(null)
    request('/perfiles/monitor').then(data => {
      if (data.perfil !== null && (!data.perfil || typeof data.perfil !== 'object' || Array.isArray(data.perfil))) throw new Error('Formato de perfil no válido.')
      if (active) { setPerfil(data.perfil); setSelected((data.perfil?.materiasOfrecidas || []).map(id)) }
    }).catch(err => {
      if (!active) return
      if (err instanceof ApiError && err.status === 404 && err.code === 'PERFIL_NO_ENCONTRADO') { setPerfil(null); setSelected([]) }
      else setLoadError(mensajeError(err))
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [revision])
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const form = new FormData(event.currentTarget)
    setError('')
    const body = { biografia: String(form.get('biografia') || '').trim(), experienciaAcademica: String(form.get('experiencia') || '').trim(), enfoqueEnsenanza: String(form.get('enfoque') || '').trim(), materiasOfrecidas: selected, tarifaPorHora: Number(form.get('tarifa')), modalidades: form.getAll('modalidades').map(String), disponibilidadHoraria: String(form.get('disponibilidad') || '').trim() }
    if (!perfilCompleto(body)) { setError('Completa los textos con las longitudes indicadas, elige al menos una materia y una modalidad, y revisa la tarifa.'); return }
    setBusy(true)
    try {
      const result = await request('/perfiles/monitor', 'PUT', body)
      if (!perfilCompleto(result.perfil)) throw new Error('El servidor no devolvió un perfil completo. Reintenta el guardado.')
      setPerfil(result.perfil)
      onSaved?.()
      navigate('/monitor', { replace: true })
    } catch (err) { setError(mensajeError(err)) } finally { setBusy(false) }
  }
  return <MonitorLayout>
    <PageHero title={initial ? 'Completa tu perfil de monitor' : 'Mi perfil de monitor'} description="Comparte tu experiencia, tus materias y cómo te gustaría enseñar." />
    <div className="stack stack--lg">
      {!initial && <div><Button variant="secondary" disabled={busy} onClick={() => navigate('/monitor')}>Volver al panel</Button></div>}
      {loading ? <Card title="Perfil"><p role="status">Cargando perfil...</p></Card> : loadError ? <Card title="Perfil"><p role="alert">{loadError}</p><Button onClick={() => setRevision(v => v + 1)}>Reintentar</Button></Card> : <Card title="Datos del monitor">
        <form onSubmit={save} style={{ display: 'grid', gap: 20 }}>
          <p>{getSession()?.name} · {getSession()?.email}</p>
          <p>Completa y guarda tu perfil para habilitar la carga de soportes. La disponibilidad para reservas se publica desde el calendario.</p>
          {error && <p role="alert">{error}</p>}
          <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0, minWidth: 0, display: 'grid', gap: 20 }}>
            <label style={field}>Biografía (20 a 1000 caracteres) *<textarea style={control} rows={3} name="biografia" required minLength={20} maxLength={1000} defaultValue={perfil?.biografia || ''} /></label>
            <label style={field}>Experiencia académica (20 a 1000 caracteres) *<textarea style={control} rows={3} name="experiencia" required minLength={20} maxLength={1000} defaultValue={perfil?.experienciaAcademica || ''} /></label>
            <label style={field}>Enfoque de enseñanza (20 a 1000 caracteres) *<textarea style={control} rows={3} name="enfoque" required minLength={20} maxLength={1000} defaultValue={perfil?.enfoqueEnsenanza || ''} /></label>
            <div style={field}><span>Materias ofrecidas (elige al menos una) *</span>
              {materias.loading ? <p role="status">Cargando materias...</p> : materias.error ? <div><p role="alert">{materias.error}</p><Button type="button" onClick={materias.refresh}>Reintentar materias</Button></div> : materias.items.length === 0 ? <div><p>No hay materias disponibles. Solicita al administrador que registre el catálogo.</p><Button type="button" onClick={materias.refresh}>Actualizar materias</Button></div> : <div style={{ display: 'grid', gap: 10, maxHeight: 240, overflowY: 'auto' }}>{materias.items.map(m => <label key={id(m)} style={{ display: 'flex', gap: 10, alignItems: 'center' }}><input type="checkbox" checked={selected.includes(id(m))} onChange={e => setSelected(previous => e.target.checked ? [...previous, id(m)] : previous.filter(value => value !== id(m)))} />{m.nombre} ({m.codigo})</label>)}</div>}
            </div>
            <label style={field}>Tarifa por hora *<input style={control} type="number" name="tarifa" min={0} max={1000000} step={0.01} defaultValue={perfil?.tarifaPorHora ?? ''} required /></label>
            <label style={field}>Modalidades (selecciona al menos una) *<select style={control} name="modalidades" multiple required defaultValue={perfil?.modalidades || []}><option>Presencial</option><option>Virtual</option><option>Ambas</option></select></label>
            <label style={field}>Disponibilidad habitual (10 a 500 caracteres) *<textarea style={control} rows={3} name="disponibilidad" required minLength={10} maxLength={500} defaultValue={perfil?.disponibilidadHoraria || ''} /></label>
            <div><Button type="submit" disabled={busy || selected.length === 0}>{busy ? 'Guardando perfil...' : 'Guardar perfil'}</Button></div>
          </fieldset>
        </form>
      </Card>}
      <Card title="Soportes académicos">
        <SoportesMateria materiasSeleccionadas={selected} materias={materias.items} />
      </Card>
    </div>
  </MonitorLayout>
}
