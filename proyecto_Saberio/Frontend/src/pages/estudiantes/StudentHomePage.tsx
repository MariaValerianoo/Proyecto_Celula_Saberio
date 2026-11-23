import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type {
  Monitor,
  SessionRequestForm,
  StudentProfile,
} from '../../types/monitoring'

import { getSession } from '../../services/authService'
import { firstName, normalize } from '../../utils/format'
import { filterMonitors } from '../../utils/search'
import { useToast } from '../../hooks/useToast'

import './StudentHomePage.css'


import {
  initialRequests,
  monitors,
  studentNotifications,
  studentProfile,
} from '../../data/studentMock'


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


function StudentHomePage() {
  const user = getSession()
  const navigate = useNavigate()
  const { message, visible, showToast } = useToast()



  // FILTRO DEL ASISTENTE
  const [assistantFilter, setAssistantFilter] = useState<{
    subject: string
    topic: string | null
  } | null>(null)


  // FILTROS MANUALES
  const [query, setQuery] = useState('')
  const [queryTags, setQueryTags] = useState<string[]>([])
  const [modality, setModality] = useState('')
  const [minRating, setMinRating] = useState('')
  const [sort, setSort] = useState('best')


  // =========================================
  // BUSCAR DESDE EL HERO
  // =========================================

  const handleHeroSearch = (searchValue?: string) => {
    const value = (searchValue ?? query).trim()

    if (!value) return

    navigate('/estudiante/buscar-monitoria', {
      state: {
        query: value,
      },
    })
  }


  // Agregar una búsqueda sin eliminar las anteriores.
  const handleQuerySubmit = (searchValue?: string) => {
    const value = (searchValue ?? query).trim()
    if (!value) return

    setQueryTags((previous) =>
      previous.some((tag) => normalize(tag) === normalize(value))
        ? previous
        : [...previous, value],
    )

    setQuery('')
  }


  // RESPUESTA DEL ASISTENTE
  const handleStudentMatch = (subject: string, topic: string | null) => {
    setAssistantFilter({ subject, topic })
    setQuery(topic || subject)
  }


  // LIMPIAR FILTROS
  const clearFilters = () => {
    setQuery('')
    setQueryTags([])
    setModality('')
    setMinRating('')
    setSort('best')
    setAssistantFilter(null)
  }


  // HORARIOS Y SOLICITUDES
  const [selection, setSelection] = useState<{
    monitorId: number
    slot: string
  } | null>(null)


  const [requesting, setRequesting] = useState<{
    monitor: Monitor
    slot: string
  } | null>(null)


  // PERFIL Y SOLICITUDES
  const [profile, setProfile] = useState<StudentProfile>(studentProfile)
  const [editingProfile, setEditingProfile] = useState(false)
  const [requests, setRequests] = useState(initialRequests)


  // RESULTADOS
  const results = useMemo(() => {
    const manualResults = filterMonitors(monitors, {
      query: queryTags.join(' '),
      modality,
      minRating,
      sort,
    })

    if (!assistantFilter) return manualResults

    return manualResults.filter((monitor) => {
      const sameSubject =
        normalize(monitor.subject).includes(normalize(assistantFilter.subject)) ||
        normalize(assistantFilter.subject).includes(normalize(monitor.subject))

      const sameTopic =
        !assistantFilter.topic ||
        monitor.topics.some(
          (topic) =>
            normalize(topic).includes(normalize(assistantFilter.topic!)) ||
            normalize(assistantFilter.topic!).includes(normalize(topic)),
        )

      return sameSubject && sameTopic
    })
  }, [queryTags, modality, minRating, sort, assistantFilter])


  // En Inicio mostramos solo tres sugerencias.
  const suggestedMonitors = results.slice(0, 3)


  // SELECCIÓN DE HORARIOS
  const handleSelectSlot = (monitorId: number, slot: string) => {
    const same = selection?.monitorId === monitorId && selection.slot === slot
    setSelection(same ? null : { monitorId, slot })
  }


  // ENVIAR SOLICITUD
  const handleSubmitRequest = (_data: SessionRequestForm) => {
    if (!requesting) return

    setRequests((previous) => [
      {
        id: Date.now(),
        initials: requesting.monitor.initials,
        color: requesting.monitor.color,
        subject: requesting.monitor.subject,
        detail: `Enviada a ${requesting.monitor.name}`,
        status: 'pending',
      },
      ...previous,
    ])


    showToast(`Solicitud enviada a ${requesting.monitor.name} para ${requesting.slot} ✅`)
    setRequesting(null)
    setSelection(null)
  }


  return (
    <DashboardLayout role="estudiante" notifications={studentNotifications}>
      <div className="student-page">
        {/* Hero de inicio */}
        <div className="student-hero">
          <PageHero
            greeting={`Hola, ${firstName(user?.name ?? '')} 👋`}
            title="¿Qué quieres estudiar hoy?"
          >
            <div className="student-home-hero-content">
              <p className="student-home-hero-description">
                Encuentra un monitor que te ayude a preparar tus parciales, resolver dudas y reforzar tus materias.
              </p>

              <form
                className="student-home-search"
                onSubmit={(e) => {
                  e.preventDefault()
                  handleHeroSearch()
                }}
              >
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ej. Integrales por partes, parcial el jueves..."
                  aria-label="Buscar materia o tema"
                />
                <button type="submit" aria-label="Buscar monitoría">
                  <svg
                    viewBox="0 0 24 24"
                    width="20"
                    height="20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M5 12h14" />
                    <path d="m13 6 6 6-6 6" />
                  </svg>
                </button>
              </form>
            </div>
          </PageHero>
        </div>


        {/* Contenido principal */}
        <div className="main-grid">
          {/* Sugerencias de monitores */}
          <Card
            title="Sugerencias para ti"
            subtitle={`${suggestedMonitors.length} sugerencias`}
          >
            {/* Filtro activo del asistente */}
            {assistantFilter && (
              <div className="assistant-filter">
                <div>
                  <span>Resultados del asistente</span>
                  <strong>
                    {assistantFilter.subject}
                    {assistantFilter.topic ? ` · ${assistantFilter.topic}` : ''}
                  </strong>
                </div>
                <button type="button" onClick={() => setAssistantFilter(null)}>
                  Quitar filtro
                </button>
              </div>
            )}

            {/* Sugerencias */}
            {suggestedMonitors.length === 0 ? (
              <EmptyState
                title="No encontramos monitores para eso"
                message="Prueba con otro tema o modifica los filtros de búsqueda."
                actionLabel="Ver todos los monitores"
                onAction={clearFilters}
              />
            ) : (
              <div className="stack">
                {suggestedMonitors.map((monitor) => (
                  <MonitorCard
                    key={monitor.id}
                    monitor={monitor}
                    selectedSlot={
                      selection?.monitorId === monitor.id ? selection.slot : null
                    }
                    onSelectSlot={(slot) => handleSelectSlot(monitor.id, slot)}
                    onReserve={() => {
                      if (selection?.monitorId === monitor.id) {
                        setRequesting({ monitor, slot: selection.slot })
                      }
                    }}
                  />
                ))}
              </div>
            )}
          </Card>


          {/* Panel lateral */}
          <aside className="stack side">
            <ProfileCard
              profile={profile}
              onEdit={() => setEditingProfile(true)}
            />

            <Card title="Solicitudes en proceso" small>
              <div className="stack" style={{ gap: 12 }}>
                {requests.map((request) => (
                  <ListRow
                    key={request.id}
                    leading={
                      <Avatar
                        initials={request.initials}
                        color={request.color}
                        size={38}
                      />
                    }
                    title={request.subject}
                    subtitle={request.detail}
                    trailing={
                      <StatusBadge
                        tone={request.status === 'pending' ? 'pending' : 'review'}
                      >
                        {request.status === 'pending' ? 'Pendiente' : 'En revisión'}
                      </StatusBadge>
                    }
                  />
                ))}
              </div>
            </Card>
          </aside>
        </div>
      </div>


      {/* Modal de solicitud */}
      {requesting && (
        <RequestModal
          monitor={requesting.monitor}
          slot={requesting.slot}
          onClose={() => setRequesting(null)}
          onSubmit={handleSubmitRequest}
        />
      )}


      {/* Modal de perfil */}
      {editingProfile && (
        <ProfileModal
          profile={profile}
          onClose={() => setEditingProfile(false)}
          onSave={(updatedProfile) => {
            setProfile(updatedProfile)
            setEditingProfile(false)
            showToast('Perfil actualizado ✅')
          }}
        />
      )}

      <Toast message={message} visible={visible} />
    </DashboardLayout>
  )
}


export default StudentHomePage
