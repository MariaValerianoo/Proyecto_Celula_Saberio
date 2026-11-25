import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import DashboardLayout from '../../components/layout/DashboardLayout/DashboardLayout'
import PageHero from '../../components/layout/PageHero/PageHero'
import Card from '../../components/shared/Card/Card'
import EmptyState from '../../components/shared/EmptyState/EmptyState'
import Button from '../../components/Button/Button'
import { api, ApiError } from '../../services/authService'
import '../../components/shared/MonitoringControls.css'
type Referencia = string | { nombre?: string } | null
interface Registro { id: string; materia?: Referencia; monitor?: Referencia; tema?: string; estado: string; modalidad?: string; fecha?: string; hora?: string; fechaPreferida?: string; horaPreferida?: string; lugarOEnlace?: string; respuestaMonitor?: string }
export function validarLista(data: unknown): Registro[] {
 if (!Array.isArray(data)) throw new Error('La API devolvió una lista con formato no válido.')
 return data.map(value => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('La API devolvió un registro con formato no válido.')
  const item = value as Record<string, unknown>
  const id = typeof item.id === 'string' && item.id.trim() ? item.id : item._id
  if (typeof id !== 'string' || !id.trim() || typeof item.estado !== 'string') throw new Error('La API devolvió un registro sin identificador o estado válido.')
  return { ...item, id } as unknown as Registro
 })
}
function nombre(v: Referencia | undefined, fallback: string) { return v && typeof v === 'object' ? v.nombre || fallback : fallback }
function fecha(v?: string) { if (!v) return 'Sin fecha'; const d = new Date(v); return Number.isNaN(d.getTime()) ? 'Fecha no disponible' : d.toLocaleDateString('es-CO', { timeZone: 'UTC' }) }
function Fila({ item, sesion = false }: { item: Registro; sesion?: boolean }) {
 return <article className="monitoring-record"><h3>{nombre(item.materia,'Materia no disponible')}</h3><p>{nombre(item.monitor,'Monitor no disponible')} · {item.modalidad || 'Modalidad no disponible'}</p>{item.tema && <p>{item.tema}</p>}<p>{fecha(sesion ? item.fecha : item.fechaPreferida)} · {(sesion ? item.hora : item.horaPreferida) || 'Sin hora'}</p><p>Estado: {item.estado}</p>{sesion && item.lugarOEnlace && <p>Lugar o enlace: {item.lugarOEnlace}</p>}{!sesion && item.respuestaMonitor && <p>Respuesta del monitor: {item.respuestaMonitor}</p>}</article>
}
export default function MyMonitoringsPage() {
 const [sesiones,setSesiones] = useState<Registro[]>([])
 const [solicitudes,setSolicitudes] = useState<Registro[]>([])
 const [loading,setLoading] = useState(true)
 const [error,setError] = useState('')
 const [unauthorized,setUnauthorized] = useState(false)
 const [attempt,setAttempt] = useState(0)
 useEffect(() => {
  let active = true
  setLoading(true);setError('');setUnauthorized(false);setSesiones([]);setSolicitudes([])
  Promise.all([api('/sesiones'),api('/solicitudes')]).then(([s,r]) => {
   const sesionesValidas = validarLista(s.sesiones), solicitudesValidas = validarLista(r.solicitudes)
   if(active){setSesiones(sesionesValidas);setSolicitudes(solicitudesValidas)}
  }).catch(e => {if(active){setError(e instanceof Error ? e.message : 'No se pudieron cargar tus monitorías.');setUnauthorized(e instanceof ApiError && e.status === 401)}}).finally(() => {if(active)setLoading(false)})
  return () => {active=false}
 },[attempt])
 const programadas = sesiones.filter(s=>s.estado==='Programada')
 const anteriores = sesiones.filter(s=>s.estado!=='Programada')
 return <DashboardLayout role="estudiante" notifications={[]}><PageHero title="Mis monitorías" description="Consulta tus sesiones y solicitudes de monitoría."/>{loading ? <p role="status">Cargando monitorías y solicitudes...</p> : error ? <Card title="No pudimos cargar tus monitorías"><p role="alert">{error}</p><div className="monitoring-actions"><Button onClick={()=>setAttempt(v=>v+1)}>Reintentar</Button>{unauthorized && <Link className="monitoring-link" to="/login">Volver a iniciar sesión</Link>}</div></Card> : <><div className="monitoring-actions"><Button variant="secondary" onClick={()=>setAttempt(v=>v+1)}>Actualizar datos</Button></div><div className="main-grid"><div><Card title="Sesiones programadas">{programadas.length ? programadas.map(item=><Fila key={item.id} item={item} sesion/>) : <EmptyState title="No tienes sesiones programadas" message="Aquí aparecerán las sesiones cuando tu monitor las programe."/>}</Card><Card title="Otras sesiones">{anteriores.length ? anteriores.map(item=><Fila key={item.id} item={item} sesion/>) : <EmptyState title="Sin otras sesiones" message="Todavía no hay sesiones completadas o canceladas."/>}</Card></div><aside className="side"><Card title="Mis solicitudes" small>{solicitudes.length ? solicitudes.map(item=><Fila key={item.id} item={item}/>) : <EmptyState title="No tienes solicitudes" message="Tus solicitudes aparecerán aquí después de enviarlas a un monitor."/>}</Card></aside></div></>}</DashboardLayout>
}
