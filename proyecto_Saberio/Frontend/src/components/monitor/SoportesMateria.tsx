import { useEffect, useRef, useState } from 'react'
import Button from '../Button/Button'
import { request, id, nombre, mensajeError } from '../../services/tutoriaService'
import type { Materia, Ref } from '../../services/tutoriaService'
import './SoportesMateria.css'
interface Soporte { id?: string; _id?: string; materia: Ref; tipoDocumento: string; estado: string; nombreOriginal?: string; observacionesAdmin?: string }
interface Props { materiasSeleccionadas: string[]; materias: Materia[]; disabled?: boolean }
export default function SoportesMateria({ materiasSeleccionadas, materias, disabled = false }: Props) {
  const [tipo, setTipo] = useState('Soporte académico')
  const [archivos, setArchivos] = useState<Record<string, File | null>>({})
  const [busy, setBusy] = useState('')
  const lock = useRef(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [soportes, setSoportes] = useState<Soporte[]>([])
  const [saved, setSaved] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [ready, setReady] = useState(false)
  const [revision, setRevision] = useState(0)
  const [versions, setVersions] = useState<Record<string, number>>({})
  useEffect(() => {
    let active = true
    setLoading(true); setReady(false); setError('')
    Promise.all([request('/soportes/propios'), request('/perfiles/monitor')]).then(([data, profile]) => {
      if (!Array.isArray(data.soportes)) throw new Error('Respuesta de soportes no válida.')
      if (active) { setSoportes(data.soportes); setSaved((profile.perfil?.materiasOfrecidas || []).map((m: Ref) => id(m))); setReady(true) }
    }).catch(err => { if (active) setError(mensajeError(err)) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [revision])
  async function subir(materia: string) {
    if (lock.current || disabled || !ready || !saved.includes(materia)) return
    const file = archivos[materia]
    if (!file || !['application/pdf', 'image/png', 'image/jpeg'].includes(file.type) || !file.size || file.size > 5 * 1024 * 1024) { setError('Selecciona un PDF, PNG o JPG de hasta 5 MB y que no esté vacío.'); return }
    lock.current = true; setBusy(materia); setError(''); setMessage('')
    try {
      const body = new FormData()
      body.append('tipoDocumento', tipo); body.append('materia', materia); body.append('archivo', file)
      const response = await fetch('/api/soportes', { method: 'POST', credentials: 'include', cache: 'no-store', body })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error?.mensaje || data?.mensaje || `No se pudo cargar el soporte (${response.status}).`)
      if (!data?.soporte) throw new Error('El servidor no confirmó la carga. Actualiza la lista antes de reintentar.')
      setMessage('Soporte recibido. Está pendiente de revisión por el administrador.')
      setArchivos(prev => ({ ...prev, [materia]: null }))
      setVersions(prev => ({ ...prev, [materia]: (prev[materia] || 0) + 1 }))
      setRevision(prev => prev + 1)
    } catch (err) { setError(mensajeError(err)) }
    finally { lock.current = false; setBusy('') }
  }
  const visibles = materias.filter(m => materiasSeleccionadas.includes(id(m)))
  return <section className="soportes-materia" aria-label="Carga de soportes académicos">
    <div className="soportes-materia__intro"><span className="soportes-materia__icon" aria-hidden="true">↑</span><div><h3>Acredita tus materias</h3><p>Adjunta tus documentos para que el administrador pueda revisarlos. PDF, PNG o JPG · Máximo 5 MB por archivo.</p></div></div>
    <div className="soportes-materia__toolbar"><label>Tipo de documento<select value={tipo} disabled={disabled || !!busy} onChange={e => setTipo(e.target.value)}><option>Soporte académico</option><option>Documento de identidad</option></select></label><Button variant="secondary" disabled={loading || !!busy} onClick={() => setRevision(v => v + 1)}>Actualizar soportes</Button></div>
    {message && <div className="soportes-materia__notice" role="status">{message}</div>}
    {error && <div className="soportes-materia__notice soportes-materia__notice--error" role="alert">{error}</div>}
    {loading && <p role="status">Consultando tus soportes y materias guardadas...</p>}
    {!visibles.length && <div className="soportes-materia__empty">Selecciona y guarda tus materias en el perfil para comenzar.</div>}
    <div className="soportes-materia__grid">{visibles.map(m => {
      const key = id(m)
      const file = archivos[key]
      const enabled = ready && saved.includes(key)
      return <article key={key} className="soportes-materia__card"><header><h4>{nombre(m)}</h4><span className="soportes-materia__tag">Soporte por materia</span></header>
        {!loading && !enabled && <p>Guarda primero el perfil con esta materia y después actualiza los soportes.</p>}
        <label className={`soportes-materia__upload ${!enabled || !!busy ? 'is-disabled' : ''}`}><span className="soportes-materia__upload-icon" aria-hidden="true">↑</span><strong>{file ? 'Archivo seleccionado' : 'Seleccionar documento'}</strong><span>{file ? file.name : 'PDF, PNG o JPG de hasta 5 MB'}</span>{file && <small>{(file.size / 1024 / 1024).toFixed(2)} MB</small>}<input key={versions[key] || 0} type="file" aria-label={`Seleccionar soporte para ${nombre(m)}`} accept=".pdf,.png,.jpg,.jpeg" disabled={disabled || !!busy || !enabled} onChange={e => { setError(''); setArchivos(prev => ({ ...prev, [key]: e.target.files?.[0] || null })) }} /></label>
        <div className="soportes-materia__actions"><Button disabled={disabled || !!busy || !file || !enabled} loading={busy === key} loadingText="Subiendo documento..." onClick={() => subir(key)}>Cargar soporte</Button></div>
        <ul className="soportes-materia__list">{soportes.filter(s => id(s.materia) === key).map(s => <li key={id(s)}><div><span>{s.nombreOriginal || s.tipoDocumento}</span><span className={`soportes-materia__status ${s.estado === 'Aprobado' ? 'is-approved' : s.estado === 'Rechazado' ? 'is-rejected' : ''}`}>{s.estado}</span></div>{s.observacionesAdmin && <p>{s.observacionesAdmin}</p>}</li>)}</ul>
      </article>
    })}</div>
  </section>
}
