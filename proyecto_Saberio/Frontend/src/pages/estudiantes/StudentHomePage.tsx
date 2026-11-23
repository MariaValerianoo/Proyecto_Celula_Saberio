import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Monitor, SessionRequestForm, StudentProfile } from '../../types/monitoring'
import { getSession } from '../../services/authService'
import { firstName, normalize } from '../../utils/format'
import { useToast } from '../../hooks/useToast'
import { request, id, nombre, dia, mensajeError } from '../../services/tutoriaService'
import type { Resultado, PublicacionBusqueda } from '../../services/tutoriaService'
import { initialRequests, studentNotifications, studentProfile } from '../../data/studentMock'
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
import ProfileModal from '../../components/estudiante/ProfileModal'
import './StudentHomePage.css'

const AVATAR_COLORS = ['primary', 'purple', 'blue', 'dark'] as const

interface Tarjeta extends Monitor {
  resultado: Resultado
  publicacion: PublicacionBusqueda
}

function StudentHomePage() {
  const user = getSession()
  const navigate = useNavigate()
  const { message, visible, showToast } = useToast()
  const [assistantFilter, setAssistantFilter] = useState<{ subject: string; topic: string | null } | null>(null)
  const [query, setQuery] = useState('')
  const [queryTags, setQueryTags] = useState<string[]>([])
  const [modality, setModality] = useState('')
  const [minRating, setMinRating] = useState('')
  const [sort, setSort] = useState('best')
  const [selection, setSelection] = useState<{ monitorId: string; slot: string } | null>(null)
  const [requesting, setRequesting] = useState<Tarjeta | null>(null)
  const [items, setItems] = useState<Resultado[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const [profile, setProfile] = useState<StudentProfile>(studentProfile)
  const [editingProfile, setEditingProfile] = useState(false)
  const [requests, setRequests] = useState(initialRequests)

  useEffect(() => {
    let active = true
    setLoading(true); setError(''); setItems([])
    const params = new URLSearchParams()
    if (modality) params.set('modalidad', modality)
    if (minRating) params.set('calificacionMinima', minRating)
    if (sort === 'rating') params.set('orden', 'calificacion')
    if (sort === 'exp') params.set('orden', 'experiencia')
    if (sort === 'slots') params.set('orden', 'disponibilidad')
    request('/busqueda/monitores?' + params).then(data => {
      if (!Array.isArray(data.monitores)) throw new Error('Formato de resultados no válido.')
      if (active) setItems(data.monitores)
    }).catch(err => { if (active) setError(mensajeError(err)) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [modality, minRating, sort, revision])

  const handleHeroSearch = (searchValue?: string) => {
    const value = (searchValue ?? query).trim()
    if (!value) return
    navigate('/estudiante/buscar-monitoria', { state: { query: value } })
  }

  const handleQuerySubmit = (searchValue?: string) => {
    const value = (searchValue ?? query).trim()
    if (!value) return
    setQueryTags(prev => prev.some(tag => normalize(tag) === normalize(value)) ? prev : [...prev, value])
    setQuery('')
  }

  const handleStudentMatch = (subject: string, topic: string | null) => {
    setAssistantFilter({ subject, topic })
    setQuery(topic || subject)
  }

  const clearFilters = () => {
    setQuery(''); setQueryTags([]); setModality(''); setMinRating(''); setSort('best'); setAssistantFilter(null)
  }

  const normalizar = (valor: string) => valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  const termino = queryTags.join(' ')

  const tarjetas = useMemo<Tarjeta[]>(() => {
    const resultado: Tarjeta[] = []
    items.forEach(item => {
      const nombreMonitor = nombre(item.monitor)
      item.publicaciones.forEach((publicacion, indice) => {
        const texto = normalizar(`${nombreMonitor} ${nombre(publicacion.materia)} ${publicacion.descripcion || ''}`)
        if (termino && !texto.includes(normalizar(termino))) return
        const calificacion = item.calificacion ?? 0
        if (minRating && calificacion < Number(minRating)) return
        const color = AVATAR_COLORS[indice % AVATAR_COLORS.length]
        resultado.push({
          id: indice,
          name: nombreMonitor,
          initials: nombreMonitor.slice(0, 2).toUpperCase(),
          color,
          career: 'Monitor aprobado',
          subject: nombre(publicacion.materia),
          rating: calificacion,
          helped: item.totalEvaluaciones,
          response: '—',
          online: false,
          modality: publicacion.modalidad === 'Ambas' ? 'Ambas' : publicacion.modalidad,
          tagline: publicacion.descripcion || 'Monitoría disponible',
          topics: [],
          keywords: [],
          slots: item.disponibilidad.map(d => `${dia(d.fecha)} · ${d.horaInicio}–${d.horaFin}`),
          resultado: item,
          publicacion,
        })
      })
    })
    if (assistantFilter) {
      return resultado.filter(m => normalizar(m.subject).includes(normalizar(assistantFilter.subject)))
    }
    if (sort === 'best' || sort === 'rating') resultado.sort((a, b) => b.rating - a.rating)
    if (sort === 'slots') resultado.sort((a, b) => b.slots.length - a.slots.length)
    if (sort === 'exp') resultado.sort((a, b) => b.helped - a.helped)
    return resultado
  }, [items, termino, minRating, sort, assistantFilter])

  const sugeridos = tarjetas.slice(0, 3)

  const handleSelectSlot = (monitorId: string, slot: string) => {
    const same = selection?.monitorId === monitorId && selection.slot === slot
    setSelection(same ? null : { monitorId, slot })
  }

  const handleSubmitRequest = async (data: SessionRequestForm) => {
    if (!requesting) return
    try {
      const resultado = await request('/solicitudes', 'POST', {
        monitor: id(requesting.resultado.monitor),
        materia: id(requesting.publicacion.materia),
        tema: data.topic,
        descripcion: `${data.goal}. ${data.notes || ''}`.trim(),
        modalidad: data.modality,
        fechaPreferida: selection?.slot.split(' · ')[0] || new Date().toISOString().slice(0, 10),
        horaPreferida: selection?.slot.split(' · ')[1]?.split('–')[0] || '08:00',
        duracionEstimadaHoras: 1,
      })
      showToast(resultado.mensaje || 'Solicitud enviada ✅')
      setRequesting(null); setSelection(null); setRevision(v => v + 1)
    } catch (err) { setError(mensajeError(err)) }
  }

  return (
    <DashboardLayout role="estudiante" notifications={studentNotifications}>
      <div className="student-page">
        <div className="student-hero">
          <PageHero greeting={`Hola, ${firstName(user?.name ?? '')} 👋`} title="¿Qué quieres estudiar hoy?">
            <div className="student-home-hero-content">
              <p className="student-home-hero-description">Encuentra un monitor que te ayude a preparar tus parciales, resolver dudas y reforzar tus materias.</p>
              <form className="student-home-search" onSubmit={e => { e.preventDefault(); handleHeroSearch() }}>
                <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Ej. Integrales por partes, parcial el jueves..." aria-label="Buscar materia o tema" />
                <button type="submit" aria-label="Buscar monitoría"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg></button>
              </form>
            </div>
          </PageHero>
        </div>
        <div className="main-grid">
          <Card title="Sugerencias para ti" subtitle={`${sugeridos.length} sugerencias`}>
            {assistantFilter && <div className="assistant-filter"><div><span>Resultados del asistente</span><strong>{assistantFilter.subject}{assistantFilter.topic ? ` · ${assistantFilter.topic}` : ''}</strong></div><button type="button" onClick={() => setAssistantFilter(null)}>Quitar filtro</button></div>}
            {loading ? <p role="status">Cargando monitores...</p> : error ? <EmptyState title="No pudimos cargar los monitores" message={error} actionLabel="Reintentar" onAction={() => setRevision(v => v + 1)} /> : sugeridos.length === 0 ? <EmptyState title="No encontramos monitores para eso" message="Prueba con otro tema o modifica los filtros de búsqueda." actionLabel="Ver todos los monitores" onAction={clearFilters} /> : (
              <div className="stack">
                {sugeridos.map(monitor => <MonitorCard key={`${id(monitor.resultado.monitor)}-${monitor.id}`} monitor={monitor} selectedSlot={selection?.monitorId === String(monitor.id) ? selection.slot : null} onSelectSlot={slot => handleSelectSlot(String(monitor.id), slot)} onReserve={() => { if (selection?.monitorId === String(monitor.id)) setRequesting(monitor) }} />)}
              </div>
            )}
          </Card>
          <aside className="stack side">
            <ProfileCard profile={profile} onEdit={() => setEditingProfile(true)} />
            <Card title="Solicitudes en proceso" small>
              <div className="stack" style={{ gap: 12 }}>
                {requests.map(solicitud => <ListRow key={solicitud.id} leading={<Avatar initials={solicitud.initials} color={solicitud.color} size={38} />} title={solicitud.subject} subtitle={solicitud.detail} trailing={<StatusBadge tone={solicitud.status === 'pending' ? 'pending' : 'review'}>{solicitud.status === 'pending' ? 'Pendiente' : 'En revisión'}</StatusBadge>} />)}
              </div>
            </Card>
          </aside>
        </div>
      </div>
      {requesting && <RequestModal monitor={requesting} slot={selection?.slot || ''} onClose={() => setRequesting(null)} onSubmit={handleSubmitRequest} />}
      {editingProfile && <ProfileModal profile={profile} onClose={() => setEditingProfile(false)} onSave={p => { setProfile(p); setEditingProfile(false); showToast('Perfil actualizado ✅') }} />}
      <Toast message={message} visible={visible} />
    </DashboardLayout>
  )
}

export default StudentHomePage