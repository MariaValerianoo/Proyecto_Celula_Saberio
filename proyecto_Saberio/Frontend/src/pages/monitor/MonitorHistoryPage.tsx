import MonitorLayout from '../../components/monitor/MonitorLayout/MonitorLayout'
import PageHero from '../../components/layout/PageHero/PageHero'
import Card from '../../components/shared/Card/Card'
import { useLista, id, nombre, dia } from '../../services/tutoriaService'
import type { Sesion } from '../../services/tutoriaService'
export default function MonitorHistoryPage() {
  const remote = useLista<Sesion>('/sesiones', 'sesiones')
  return <MonitorLayout><PageHero title="Historial de sesiones" description="Sesiones reales asociadas a tu cuenta de monitor." />
    {remote.loading ? <p role="status">Cargando historial...</p> : remote.error ? <div role="alert"><p>{remote.error}</p><button onClick={remote.refresh}>Reintentar</button></div> : <Card title="Sesiones">
      {!remote.items.length && <p>No tienes sesiones registradas.</p>}
      {remote.items.map(s => <article key={id(s)} style={{ padding: '16px 0', borderBottom: '1px solid #ddd' }}><h3>{nombre(s.materia)} · {nombre(s.estudiante)}</h3><p>{s.tema}</p><p>{dia(s.fecha)} · {s.hora} · {s.duracionHoras} horas · {s.modalidad}</p><p>Estado: {s.estado}</p>{s.notas && <p>Notas: {s.notas}</p>}</article>)}
    </Card>}
  </MonitorLayout>
}
