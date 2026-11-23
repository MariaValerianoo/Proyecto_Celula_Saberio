import { useEffect, useState } from 'react'
import { ApiError } from './authService'
export type Ref = string | { id?: string; _id?: string; nombre?: string } | null
export const id = (value: Ref | undefined): string => typeof value === 'string' ? value : value?.id || value?._id || ''
export const nombre = (value: Ref | undefined) => typeof value === 'object' && value ? value.nombre || 'No disponible' : 'No disponible'
export interface Solicitud { id?: string; _id?: string; materia: Ref; estudiante: Ref; monitor: Ref; tema: string; descripcion: string; modalidad: string; estado: string; fechaPreferida: string; horaPreferida: string; duracionEstimadaHoras: number; respuestaMonitor?: string }
export interface Sesion { id?: string; _id?: string; solicitud: Ref; materia: Ref; estudiante: Ref; monitor: Ref; tema: string; modalidad: string; estado: string; fecha: string; hora: string; duracionHoras: number; lugarOEnlace?: string; notas?: string }
export interface PublicacionBusqueda { id?: string; _id?: string; materia: Ref; modalidad: string; descripcion?: string; tarifaPorHora: number }
export interface Resultado { monitor: Ref; calificacion: number | null; totalEvaluaciones: number; publicaciones: PublicacionBusqueda[]; disponibilidad: { id?: string; _id?: string; fecha: string; horaInicio: string; horaFin: string }[] }
export async function request(path: string, method = 'GET', body?: unknown) {
  const response = await fetch(`/api${path}`, { method, credentials: 'include', cache: 'no-store', headers: body === undefined ? {} : { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) })
  const data = await response.json().catch(() => null)
  if (!response.ok) throw new ApiError(data?.error?.mensaje || 'No se pudo completar la solicitud.', response.status, data?.error?.codigo)
  if (!data) throw new Error('Respuesta de la API no válida.')
  return data
}
export function useLista<T>(path: string, field: string) {
  const [items, setItems] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    let active = true
    setLoading(true); setError(''); setItems([])
    request(path).then(data => {
      if (!Array.isArray(data[field])) throw new Error('Formato de respuesta no válido.')
      if (active) setItems(data[field])
    }).catch(err => { if (active) setError(err instanceof Error ? err.message : 'Error al cargar los datos.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [path, field, revision])
  return { items, loading, error, refresh: () => setRevision(v => v + 1) }
}
export function datos(form: HTMLFormElement) { return Object.fromEntries(new FormData(form).entries()) }
export const mensajeError = (err: unknown) => err instanceof Error ? err.message : 'No se pudo completar la operación.'
export const dia = (value: string) => value?.slice(0, 10) || ''
