import { useEffect, useState } from 'react'
import DashboardLayout from '../../components/layout/DashboardLayout/DashboardLayout'
import PageHero from '../../components/layout/PageHero/PageHero'
import Card from '../../components/shared/Card/Card'
import EmptyState from '../../components/shared/EmptyState/EmptyState'
import { api } from '../../services/authService'

type Referencia = string | { nombre?: string } | null
interface Registro {
  _id: string
  materia?: Referencia
  monitor?: Referencia
  tema?: string
  estado: string
  modalidad?: string
  fecha?: string
  hora?: string
  fechaPreferida?: string
  horaPreferida?: string
  lugarOEnlace?: string
  respuestaMonitor?: string
}
function nombre(valor: Referencia | undefined, fallback: string) {
  return valor && typeof valor === 'object' ? valor.nombre || fallback : fallback
}
function fecha(valor?: string) {
  if (!valor) return 'Sin fecha'
  const date = new Date(valor)
  return Number.isNaN(date.getTime()) ? 'Fecha no disponible' : date.toLocaleDateString('es-CO', { timeZone: 'UTC' })
}
function validarLista(data: unknown): Registro[] {
  if (!Array.isArray(data) || data.some(item => !item || typeof item._id !== 'string' || typeof item.estado !== 'string')) throw new Error('La API devolvió una lista con formato no válido.')
  return data as Registro[]
}
function Fila({ item, sesion = false }: { item: Registro; sesion?: boolean }) {
  return <article style={{ padding: '12px 0', borderBottom: '1px solid #ddd' }}>
    <h3>{nombre(item.materia, 'Materia no disponible')}</h3>
    <p>{nombre(item.monitor, 'Monitor no disponible')} · {item.modalidad || 'Modalidad no disponible'}</p>
    {item.tema && <p>{item.tema}</p>}
    <p>{fecha(sesion ? item.fecha : item.fechaPreferida)} · {(sesion ? item.hora : item.horaPreferida) || 'Sin hora'}</p>
    <p>Estado: {item.estado}</p>
    {sesion && item.lugarOEnlace && <p>Lugar o enlace: {item.lugarOEnlace}</p>}
    {!sesion && item.respuestaMonitor && <p>Respuesta del monitor: {item.respuestaMonitor}</p>}
  </article>
}
export default function MyMonitoringsPage() {
  const [sesiones, setSesiones] = useState<Registro[]>([])
  const [solicitudes, setSolicitudes] = useState<Registro[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    setLoading(true); setError(''); setSesiones([]); setSolicitudes([])
    Promise.all([api('/sesiones'), api('/solicitudes')])
      .then(([sessions, requests]) => {
        const s = validarLista(sessions.sesiones)
        const r = validarLista(requests.solicitudes)
        if (active) { setSesiones(s); setSolicitudes(r) }
      })
      .catch(err => { if (active) setError(err instanceof Error ? err.message : 'No se pudieron cargar tus monitorías.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [attempt])
  const programadas = sesiones.filter(s => s.estado === 'Programada')
  const anteriores = sesiones.filter(s => s.estado !== 'Programada')
  return <DashboardLayout role="estudiante" notifications={[]}>
    <PageHero title="Mis monitorías" description="Sesiones y solicitudes de tu cuenta, consultadas en el servidor." />
    {loading ? <p role="status">Cargando monitorías y solicitudes...</p> : error ? <div role="alert"><p>{error}</p><button onClick={() => setAttempt(v => v + 1)}>Reintentar</button><p><a href="/login">Volver a iniciar sesión</a></p></div> : <>
      <button onClick={() => setAttempt(v => v + 1)}>Actualizar datos</button>
      <div className="main-grid"><div>
        <Card title="Sesiones programadas">
          {programadas.length ? programadas.map(item => <Fila key={item._id} item={item} sesion />) : <EmptyState title="No tienes sesiones programadas" message="Aquí aparecerán las sesiones cuando tu monitor las programe." />}
        </Card>
        <Card title="Otras sesiones">
          {anteriores.length ? anteriores.map(item => <Fila key={item._id} item={item} sesion />) : <EmptyState title="Sin otras sesiones" message="Todavía no hay sesiones completadas o canceladas." />}
        </Card>
      </div><aside className="side"><Card title="Mis solicitudes" small>
        {solicitudes.length ? solicitudes.map(item => <Fila key={item._id} item={item} />) : <EmptyState title="No tienes solicitudes" message="Tus solicitudes aparecerán aquí después de enviarlas a un monitor." />}
      </Card></aside></div>
    </>}
  </DashboardLayout>
}
