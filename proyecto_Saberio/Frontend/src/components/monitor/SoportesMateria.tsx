import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { request, id, nombre, mensajeError } from '../../services/tutoriaService'
import type { Ref } from '../../services/tutoriaService'

const control: CSSProperties = { width: '100%', boxSizing: 'border-box', padding: 12, border: '1px solid #dcdbea', borderRadius: 12, font: 'inherit', background: '#fff', color: 'inherit' }
const field: CSSProperties = { display: 'grid', gap: 8 }

interface Soporte { id?: string; _id?: string; materia: Ref; tipoDocumento: string; estado: string; observacionesAdmin?: string; createdAt?: string }

interface Props {
  materiasSeleccionadas: string[]
  materias: Array<Record<string, unknown>>
  disabled?: boolean
}

export default function SoportesMateria({ materiasSeleccionadas, materias, disabled = false }: Props) {
  const [tipo, setTipo] = useState<'Documento de identidad' | 'Soporte académico'>('Soporte académico')
  const [archivos, setArchivos] = useState<Record<string, File | null>>({})
  const [subiendo, setSubiendo] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const [soportes, setSoportes] = useState<Soporte[]>([])
  const [cargando, setCargando] = useState(true)
  const [revision, setRevision] = useState(0)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    let activo = true
    setCargando(true); setError('')
    request('/soportes/propios').then(data => {
      if (activo) setSoportes(Array.isArray(data.soportes) ? data.soportes : [])
    }).catch(err => { if (activo) setError(mensajeError(err)) })
      .finally(() => { if (activo) setCargando(false) })
    return () => { activo = false }
  }, [revision])

  function validar(archivo: File | null | undefined) {
    if (!archivo) return 'Selecciona un archivo PDF, PNG o JPG.'
    const permitidos = ['application/pdf', 'image/png', 'image/jpeg']
    if (!permitidos.includes(archivo.type)) return 'El archivo debe ser PDF, PNG o JPG.'
    if (archivo.size > 10 * 1024 * 1024) return 'El archivo no puede superar 10 MB.'
    return ''
  }

  async function subir(materiaId: string) {
    const archivo = archivos[materiaId]
    const fallo = validar(archivo)
    if (fallo) { setError(fallo); return }
    setSubiendo(true); setError(''); setMensaje('')
    try {
      const datos = new FormData()
      datos.append('tipoDocumento', tipo)
      datos.append('materia', materiaId)
      datos.append('archivo', archivo as File)
      const respuesta = await fetch('/api/soportes', { method: 'POST', credentials: 'include', cache: 'no-store', body: datos })
      const resultado = await respuesta.json().catch(() => null)
      if (!respuesta.ok) throw new Error(resultado?.error?.mensaje || resultado?.mensaje || 'No se pudo cargar el soporte.')
      setMensaje(resultado.mensaje || 'Soporte cargado correctamente.')
      setArchivos(prev => ({ ...prev, [materiaId]: null }))
      if (inputRef.current) inputRef.current.value = ''
      setRevision(valor => valor + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el soporte.')
    } finally { setSubiendo(false) }
  }

  const materiasVisibles = materias.filter(m => materiasSeleccionadas.includes(id(m)))

  return <div style={field}>
    <span>Soportes por materia</span>
    <p>Sube un PDF, PNG o JPG de máximo 10 MB. El soporte queda pendiente hasta que un administrador lo revise; subirlo no aprueba automáticamente la materia.</p>
    <label style={field}>Tipo de documento
      <select style={control} value={tipo} onChange={e => setTipo(e.target.value as typeof tipo)} disabled={disabled || subiendo}>
        <option>Soporte académico</option>
        <option>Documento de identidad</option>
      </select>
    </label>
    {mensaje && <p role="status">{mensaje}</p>}
    {error && <p role="alert">{error}</p>}
    {!materiasVisibles.length && <p>Selecciona al menos una materia para poder cargar su soporte.</p>}
    {materiasVisibles.map(materia => {
      const materiaId = id(materia)
      const archivo = archivos[materiaId]
      const propios = soportes.filter(s => id(s.materia) === materiaId)
      return <div key={materiaId} style={{ border: '1px solid #e5e4ef', borderRadius: 14, padding: 16, display: 'grid', gap: 10 }}>
        <b>{nombre(materia)}</b>
        <input ref={materiaId === materiasVisibles[0] ? inputRef : undefined} type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" disabled={disabled || subiendo} onChange={e => setArchivos(prev => ({ ...prev, [materiaId]: e.target.files?.[0] ?? null }))} />
        {archivo && <small>{archivo.name} · {(archivo.size / 1024 / 1024).toFixed(2)} MB</small>}
        <button type="button" disabled={disabled || subiendo || !archivo} onClick={() => subir(materiaId)}>{subiendo ? 'Subiendo...' : 'Cargar soporte'}</button>
        {cargando ? <small>Cargando soportes...</small> : propios.length > 0 && <div style={{ display: 'grid', gap: 6 }}>
          {propios.map(s => <small key={id(s)}>• {s.tipoDocumento} · {s.estado}{s.observacionesAdmin ? ` · ${s.observacionesAdmin}` : ''}</small>)}
        </div>}
      </div>
    })}
  </div>
}
