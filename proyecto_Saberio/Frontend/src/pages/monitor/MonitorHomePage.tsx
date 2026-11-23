import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getSession } from '../../services/authService'
import { firstName } from '../../utils/format'
import { useLista, request, id, nombre, dia, mensajeError } from '../../services/tutoriaService'
import type { Solicitud, Sesion, Ref } from '../../services/tutoriaService'
import type { MonitorProfile } from '../../types/monitoring'
import MonitorLayout from '../../components/monitor/MonitorLayout/MonitorLayout'
import PageHero from '../../components/layout/PageHero/PageHero'
import Button from '../../components/Button/Button'
import Card from '../../components/shared/Card/Card'
import StatCard from '../../components/shared/StatCard/StatCard'
import Avatar from '../../components/shared/Avatar/Avatar'
import ListRow from '../../components/shared/ListRow/ListRow'
import StatusBadge from '../../components/shared/StatusBadge/StatusBadge'
import EmptyState from '../../components/shared/EmptyState/EmptyState'
import MonitorProfileCard from '../../components/monitor/MonitorProfileCard'

interface PerfilAPI {
  biografia?: string
  experienciaAcademica?: string
  enfoqueEnsenanza?: string
  materiasOfrecidas?: Ref[]
  tarifaPorHora?: number
  modalidades?: string[]
  disponibilidadHoraria?: string
}

export default function MonitorHomePage() {
  const user = getSession()
  const navigate = useNavigate()
  const solicitudes = useLista<Solicitud>('/solicitudes', 'solicitudes')
  const sesiones = useLista<Sesion>('/sesiones', 'sesiones')
  const [perfil, setPerfil] = useState<PerfilAPI | null>(null)
  const [perfilLoading, setPerfilLoading] = useState(true)
  const [perfilError, setPerfilError] = useState('')
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    let active = true
    setPerfilLoading(true)
    setPerfilError('')
    setPerfil(null)
    request('/perfiles/monitor').then(data => {
      const value = data.perfil
      if (value !== null && (!value || typeof value !== 'object' || Array.isArray(value))) {
        throw new Error('Formato de perfil no válido.')
      }
      if (active) setPerfil(value)
    }).catch(err => { if (active) setPerfilError(mensajeError(err)) })
      .finally(() => { if (active) setPerfilLoading(false) })
    return () => { active = false }
  }, [revision])

  const pending = solicitudes.items.filter(s => s.estado === 'Pendiente')
  const accepted = sesiones.items.filter(s => s.estado === 'Confirmada' || s.estado === 'Programada')
  const done = sesiones.items.filter(s => s.estado === 'Realizada').length
  const profile: MonitorProfile | null = perfil ? {
    bio: perfil.biografia || 'Sin registrar',
    experience: perfil.experienciaAcademica || 'Sin registrar',
    approach: perfil.enfoqueEnsenanza || 'Sin registrar',
    subjects: (perfil.materiasOfrecidas || []).map(nombre).join(', ') || 'Sin registrar',
    rate: perfil.tarifaPorHora ?? 0,
    modality: (perfil.modalidades || []).join(', ') || 'Sin registrar',
    availability: perfil.disponibilidadHoraria || 'Sin registrar',
  } : null
  const editProfile = () => navigate('/monitor/perfil')

  return (
    <MonitorLayout>
      <PageHero greeting={`Hola, ${firstName(user?.name ?? '')}`} title="Panel de Monitor" description="Gestiona tus publicaciones, revisa solicitudes y organiza tu disponibilidad en un solo lugar.">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 28 }}>
          <Button onClick={() => navigate('/monitor/publicaciones?nueva=1')}>+ Nueva publicación</Button>
          <Button variant="secondary" onClick={editProfile}>Editar perfil</Button>
          <Button variant="secondary" onClick={() => navigate('/monitor/calendario')}>Gestionar disponibilidad</Button>
        </div>
      </PageHero>
      <div className="main-grid">
        <div className="stack stack--lg">
          {solicitudes.error && <div role="alert"><p>{solicitudes.error}</p><Button onClick={solicitudes.refresh}>Reintentar solicitudes</Button></div>}
          {sesiones.error && <div role="alert"><p>{sesiones.error}</p><Button onClick={sesiones.refresh}>Reintentar sesiones</Button></div>}
          <div className="stats-grid">
            {solicitudes.loading || solicitudes.error ? <Card title="Solicitudes pendientes"><p role="status">{solicitudes.loading ? 'Cargando...' : 'No disponible'}</p></Card> : <StatCard value={pending.length} label="Solicitudes pendientes" />}
            {sesiones.loading || sesiones.error ? <Card title="Monitorías confirmadas"><p role="status">{sesiones.loading ? 'Cargando...' : 'No disponible'}</p></Card> : <StatCard value={accepted.length} label="Monitorías confirmadas" />}
            {sesiones.loading || sesiones.error ? <Card title="Monitorías realizadas"><p role="status">{sesiones.loading ? 'Cargando...' : 'No disponible'}</p></Card> : <StatCard value={done} label="Monitorías realizadas" />}
          </div>
          <Card title="Próximas sesiones" subtitle={sesiones.loading || sesiones.error ? undefined : `${accepted.length} confirmadas`}>
            {sesiones.loading ? <p role="status">Cargando sesiones...</p> : sesiones.error ? <p>No se pudieron cargar las sesiones.</p> : accepted.length === 0 ? <EmptyState title="Sin sesiones próximas" message="Las sesiones confirmadas aparecerán aquí." /> : (
              <div className="stack" style={{ gap: 12 }}>
                {accepted.map(s => <ListRow key={id(s)} leading={<Avatar initials={nombre(s.estudiante).slice(0, 2).toUpperCase()} color="primary" size={44} />} title={nombre(s.estudiante)} subtitle={`${nombre(s.materia)} · ${dia(s.fecha)} · ${s.hora}`} trailing={<StatusBadge tone="ok">{s.estado}</StatusBadge>} />)}
              </div>
            )}
          </Card>
          <Card title="Solicitudes pendientes" subtitle={solicitudes.loading || solicitudes.error ? undefined : `${pending.length} por responder`}>
            {solicitudes.loading ? <p role="status">Cargando solicitudes...</p> : solicitudes.error ? <p>No se pudieron cargar las solicitudes.</p> : pending.length === 0 ? <EmptyState title="Estás al día" message="No tienes solicitudes por responder." /> : (
              <div className="stack" style={{ gap: 12 }}>
                {pending.map(s => <ListRow key={id(s)} leading={<Avatar initials={nombre(s.estudiante).slice(0, 2).toUpperCase()} color="primary" size={44} />} title={nombre(s.estudiante)} subtitle={`${nombre(s.materia)} · ${dia(s.fechaPreferida)} · ${s.horaPreferida}`} trailing={<StatusBadge tone="pending">Pendiente</StatusBadge>} />)}
              </div>
            )}
            <p style={{ marginTop: 16 }}><Link to="/monitor/solicitudes" style={{ color: 'var(--acento)', fontWeight: 700 }}>Ver y responder solicitudes</Link></p>
          </Card>
        </div>
        <aside className="side">
          {perfilLoading ? <Card title="Tu perfil de monitor" small><p role="status">Cargando perfil...</p></Card> : perfilError ? <Card title="Tu perfil de monitor" small><p role="alert">{perfilError}</p><Button onClick={() => setRevision(v => v + 1)}>Reintentar</Button></Card> : profile ? <MonitorProfileCard profile={profile} onEdit={editProfile} /> : <Card title="Tu perfil de monitor" small><EmptyState title="Completa tu perfil" message="Todavía no tienes un perfil registrado." /><Button onClick={editProfile}>Editar perfil</Button></Card>}
        </aside>
      </div>
    </MonitorLayout>
  )
}
