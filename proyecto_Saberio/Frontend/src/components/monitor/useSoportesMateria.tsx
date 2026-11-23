import { useEffect, useRef, useState } from 'react'
import { ApiError } from '../../services/authService'
import { request, id, mensajeError } from '../../services/tutoriaService'
import type { Materia, Ref } from '../../services/tutoriaService'
import Button from '../Button/Button'
interface Soporte { id?: string; _id?: string; materia: Ref; tipoDocumento: string; estado: string; nombreOriginal: string; observacionesAdmin?: string }
export default function useSoportesMateria() {
  const [items, setItems] = useState<Soporte[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [progress, setProgress] = useState('')
  const files = useRef<Record<string, File>>({})
  const confirmed = useRef<Soporte[]>([])
  useEffect(() => {
    let active = true
    setLoading(true); setError('')
    request('/soportes/propios').then(data => {
      if (!Array.isArray(data.soportes)) throw new Error('Formato de soportes no válido.')
      if (active) { confirmed.current = data.soportes; setItems(data.soportes) }
    }).catch(err => { if (active) setError(mensajeError(err)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [attempt])
  function validFile(file: File) {
    if (!['application/pdf', 'image/png', 'image/jpeg'].includes(file.type)) throw new Error('Selecciona un archivo PDF, PNG o JPG.')
    if (file.size <= 0 || file.size > 5 * 1024 * 1024) throw new Error('El archivo debe tener contenido y no superar 5 MB.')
  }
  function exists(materia: string) {
    return confirmed.current.some(s => id(s.materia) === materia && s.tipoDocumento === 'Soporte académico' && (s.estado === 'Pendiente' || s.estado === 'Aprobado'))
  }
  function validate(selected: string[]) {
    if (loading) throw new Error('Espera a que termine la consulta de soportes.')
    if (error) throw new Error('No se pudieron consultar tus soportes. Reintenta antes de guardar.')
    const found: Record<string, string> = {}
    selected.forEach(materia => {
      const file = files.current[materia]
      if (!file && !exists(materia)) found[materia] = 'Adjunta un soporte académico para esta materia.'
      if (file) { try { validFile(file) } catch (err) { found[materia] = mensajeError(err) } }
    })
    setErrors(found)
    if (Object.keys(found).length) throw new Error('Revisa los soportes de las materias marcadas.')
  }
  async function upload(selected: string[]) {
    const failed: Record<string, string> = {}
    for (const materia of selected) {
      const file = files.current[materia]
      if (!file) continue
      setProgress(`Subiendo ${file.name}...`)
      try {
        const form = new FormData()
        form.append('tipoDocumento', 'Soporte académico'); form.append('materia', materia); form.append('archivo', file)
        const response = await fetch('/api/soportes', { method: 'POST', credentials: 'include', body: form })
        const data = await response.json().catch(() => null)
        if (!response.ok) throw new ApiError(data?.error?.mensaje || 'No se pudo cargar el soporte.', response.status, data?.error?.codigo)
        if (!data?.soporte || !id(data.soporte) || id(data.soporte.materia) !== materia) throw new Error('La carga no pudo confirmarse. Revisa tus soportes antes de reintentar.')
        confirmed.current = [data.soporte, ...confirmed.current]
        setItems([...confirmed.current]); delete files.current[materia]
      } catch (err) { failed[materia] = mensajeError(err) }
    }
    setProgress(''); setErrors(failed)
    if (Object.keys(failed).length) throw new Error('El perfil se guardó, pero hay soportes pendientes de carga. Revisa cada materia y vuelve a guardar; las cargas confirmadas no se repetirán.')
  }
  function render(selected: string[], materias: Materia[], busy: boolean) {
    return <div style={{ display: 'grid', gap: 16 }}>
      <p>Adjunta un soporte por materia. PDF, PNG o JPG, máximo 5 MB. Se suben al guardar; adjuntar no acredita la materia automáticamente.</p>
      {loading && <p role="status">Consultando soportes existentes...</p>}
      {error && <div><p role="alert">{error}</p><Button type="button" disabled={busy} onClick={() => setAttempt(v => v + 1)}>Reintentar soportes</Button></div>}
      {progress && <p role="status">{progress}</p>}
      {selected.map(materia => {
        const name = materias.find(m => id(m) === materia)?.nombre || 'Materia seleccionada'
        const propios = items.filter(s => id(s.materia) === materia && s.tipoDocumento === 'Soporte académico')
        return <div key={materia} style={{ border: '1px solid #dcdbea', padding: 16, borderRadius: 12, display: 'grid', gap: 10 }}>
          <label htmlFor={`soporte-${materia}`}>Soporte académico para {name}{exists(materia) ? ' (opcional: adjuntar otro)' : ' *'}</label>
          {propios.map(s => <div key={id(s)}><a href={`/api/soportes/${encodeURIComponent(id(s))}/descargar`} target="_blank" rel="noopener noreferrer">{s.nombreOriginal}</a><span> · {s.estado}</span>{s.observacionesAdmin && <p>{s.observacionesAdmin}</p>}</div>)}
          <input id={`soporte-${materia}`} type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" disabled={busy || loading || !!error} onChange={e => {
            const file = e.target.files?.[0]
            delete files.current[materia]
            try { if (file) { validFile(file); files.current[materia] = file }; setErrors(previous => ({ ...previous, [materia]: '' })) }
            catch (err) { e.target.value = ''; setErrors(previous => ({ ...previous, [materia]: mensajeError(err) })) }
          }} />
          {errors[materia] && <p role="alert">{errors[materia]}</p>}
        </div>
      })}
    </div>
  }
  return { validate, upload, render }
}
