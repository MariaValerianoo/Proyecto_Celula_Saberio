import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Monitor, SessionRequestForm } from '../../types/monitoring'
import { getSession } from '../../services/authService'
import { firstName } from '../../utils/format'
import { useToast } from '../../hooks/useToast'
import { request, useLista, id, nombre, dia, mensajeError } from '../../services/tutoriaService'
import type { Resultado, PublicacionBusqueda, Solicitud } from '../../services/tutoriaService'
import { useStudentProfile } from '../../components/estudiante/StudentProfileFlow'
import DashboardLayout from '../../components/layout/DashboardLayout/DashboardLayout'
import PageHero from '../../components/layout/PageHero/PageHero'
import Card from '../../components/shared/Card/Card'
import Avatar from '../../components/shared/Avatar/Avatar'
import ListRow from '../../components/shared/ListRow/ListRow'
import StatusBadge from '../../components/shared/StatusBadge/StatusBadge'
import EmptyState from '../../components/shared/EmptyState/EmptyState'
import Toast from '../../components/shared/Toast/Toast'
import MonitorCard from '../../components/estudiante/monitorCard/monitorCard'
import RequestModal from '../../components/estudiante/RequestModal'
import ProfileCard from '../../components/estudiante/ProfileCard'
import './StudentHomePage.css'
interface Tarjeta extends Monitor { key: string; resultado: Resultado; publicacion: PublicacionBusqueda }
export default function StudentHomePage() {
  const user = getSession()
  const navigate = useNavigate()
  const profile = useStudentProfile()
  const { message, visible, showToast } = useToast()
  const [query, setQuery] = useState('')
  const remote = useLista<Resultado>('/busqueda/monitores', 'monitores')
  const solicitudes = useLista<Solicitud>('/solicitudes', 'solicitudes')
  const [selection, setSelection] = useState<{ key: string; slot: string } | null>(null)
  const [requesting, setRequesting] = useState<{ monitor: Tarjeta; slot: string } | null>(null)
  const [sending, setSending] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const tarjetas = useMemo<Tarjeta[]>(() => {
    let index = 0
    return remote.items.flatMap(item => item.publicaciones.map(publicacion => {
      const name = nombre(item.monitor)
      const modality: Monitor['modality'] = publicacion.modalidad === 'Virtual' ? 'Virtual' : publicacion.modalidad === 'Presencial' ? 'Presencial' : 'Ambas'
      return { id: index++, key: `${id(item.monitor)}-${id(publicacion) || id(publicacion.materia)}`, name, initials: name.slice(0, 2).toUpperCase(), color: 'primary' as const, career: 'Monitor', subject: nombre(publicacion.materia), rating: item.calificacion ?? 0, helped: item.totalEvaluaciones, response: '—', online: false, modality, tagline: publicacion.descripcion || 'Monitoría disponible', topics: [], keywords: [], slots: item.disponibilidad.map(d => `${dia(d.fecha)} · ${d.horaInicio}–${d.horaFin}`), resultado: item, publicacion }
    })).sort((a, b) => b.rating - a.rating).slice(0, 3)
  }, [remote.items])
  const pending = solicitudes.items.filter(s => s.estado === 'Pendiente' || s.estado === 'Reprogramada')
  async function submit(data: SessionRequestForm) {
    if (!requesting || sending) return
    setSending(true); setSubmitError('')
    try {
      const [fecha, horario] = requesting.slot.split(' · ')
      if (!fecha || !horario) throw new Error('Selecciona un horario disponible.')
      const result = await request('/solicitudes', 'POST', { monitor: id(requesting.monitor.resultado.monitor), materia: id(requesting.monitor.publicacion.materia), tema: data.topic, descripcion: `${data.goal}. ${data.notes || ''}`.trim(), modalidad: data.modality, fechaPreferida: fecha, horaPreferida: horario.split('–')[0], duracionEstimadaHoras: 1 })
      showToast(result.mensaje || 'Solicitud enviada.')
      setRequesting(null); setSelection(null); solicitudes.refresh(); remote.refresh()
    } catch (err) { setSubmitError(mensajeError(err)) } finally { setSending(false) }
  }
  return <DashboardLayout role="estudiante" notifications={[]}>
    <div className="student-page">
      <div className="student-hero"><PageHero greeting={`Hola, ${firstName(user?.name ?? '')}`} title="¿Qué quieres estudiar hoy?">
        <div className="student-home-hero-content">
          <p className="student-home-hero-description">Encuentra un monitor que te ayude a preparar tus parciales, resolver dudas y reforzar tus materias.</p>
          <form className="student-home-search" onSubmit={e => { e.preventDefault(); if (query.trim()) navigate('/estudiante/buscar-monitoria', { state: { query: query.trim() } }) }}>
            <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Ej. Integrales por partes, parcial el jueves..." aria-label="Buscar materia o tema" />
            <button type="submit" aria-label="Buscar monitoría"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg></button>
          </form>
        </div>
      </PageHero></div>
      {submitError && <p role="alert">{submitError}</p>}{sending && <p role="status">Enviando solicitud...</p>}
      <div className="main-grid">
        <Card title="Sugerencias para ti" subtitle={`${tarjetas.length} sugerencias`}>
          {remote.loading ? <p role="status">Cargando monitores...</p> : remote.error ? <EmptyState title="No pudimos cargar los monitores" message={remote.error} actionLabel="Reintentar" onAction={remote.refresh} /> : tarjetas.length === 0 ? <EmptyState title="No hay monitores disponibles" message="Cuando haya publicaciones disponibles aparecerán aquí." /> : <div className="stack">{tarjetas.map(m => <MonitorCard key={m.key} monitor={m} selectedSlot={selection?.key === m.key ? selection.slot : null} onSelectSlot={slot => setSelection(previous => previous?.key === m.key && previous.slot === slot ? null : { key: m.key, slot })} onReserve={() => { if (selection?.key === m.key) { setSubmitError(''); setRequesting({ monitor: m, slot: selection.slot }) } }} />)}</div>}
        </Card>
        <aside className="stack side">
          <ProfileCard profile={profile.summary} onEdit={profile.edit} />
          <Card title="Solicitudes en proceso" small>
            {solicitudes.loading ? <p role="status">Cargando solicitudes...</p> : solicitudes.error ? <EmptyState title="No pudimos cargar tus solicitudes" message={solicitudes.error} actionLabel="Reintentar" onAction={solicitudes.refresh} /> : pending.length === 0 ? <EmptyState title="Sin solicitudes en proceso" message="Tus solicitudes pendientes aparecerán aquí." /> : <div className="stack" style={{ gap: 12 }}>{pending.map(s => <ListRow key={id(s)} leading={<Avatar initials={nombre(s.monitor).slice(0, 2).toUpperCase()} color="primary" size={38} />} title={nombre(s.materia)} subtitle={`${nombre(s.monitor)} · ${dia(s.fechaPreferida)}`} trailing={<StatusBadge tone={s.estado === 'Pendiente' ? 'pending' : 'review'}>{s.estado}</StatusBadge>} />)}</div>}
          </Card>
        </aside>
      </div>
    </div>
    {requesting && <RequestModal monitor={requesting.monitor} slot={requesting.slot} onClose={() => { if (!sending) setRequesting(null) }} onSubmit={submit} />}
    <Toast message={message} visible={visible} />
  </DashboardLayout>
}
