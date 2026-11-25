import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useLocation } from 'react-router-dom'
import type { Monitor, SessionRequestForm } from '../../types/monitoring'
import { useToast } from '../../hooks/useToast'
import { request, id, nombre, dia, mensajeError } from '../../services/tutoriaService'
import type { Resultado, PublicacionBusqueda, Disponibilidad } from '../../services/tutoriaService'
import DashboardLayout from '../../components/layout/DashboardLayout/DashboardLayout'
import PageHero from '../../components/layout/PageHero/PageHero'
import Card from '../../components/shared/Card/Card'
import EmptyState from '../../components/shared/EmptyState/EmptyState'
import Toast from '../../components/shared/Toast/Toast'
import SearchFilters from '../../components/estudiante/SearchFilters/SearchFilters'
import MonitorCard from '../../components/estudiante/monitorCard/monitorCard'
import RequestModal from '../../components/estudiante/RequestModal'
import './StudentSearchPage.css'

const QUICK_SUBJECTS = ['Cálculo', 'Programación', 'Álgebra', 'Microeconomía']
const AVATAR_COLORS = ['primary', 'purple', 'blue', 'dark'] as const

interface Tarjeta extends Monitor {
  resultado: Resultado
  publicacion: PublicacionBusqueda
}

interface Seleccion {
  monitorId: string
  slot: string
  disponibilidadId: string
}

function StudentSearchPage() {
  const location = useLocation()
  const { message, visible, showToast } = useToast()
  const incomingQuery = (location.state as { query?: string } | null)?.query ?? ''
  const [query, setQuery] = useState('')
  const [queryTags, setQueryTags] = useState<string[]>([])
  const [modality, setModality] = useState('')
  const [minRating, setMinRating] = useState('')
  const [sort, setSort] = useState('best')
  const [selection, setSelection] = useState<Seleccion | null>(null)
  const [requesting, setRequesting] = useState<Tarjeta | null>(null)
  const [items, setItems] = useState<Resultado[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true); setError(''); setItems([])
    const params = new URLSearchParams()
    if (modality) params.set('modalidad', modality)
    if (minRating) params.set('calificacionMinima', minRating)
    if (sort === 'rating') params.set('orden', 'calificacion')
    if (sort === 'exp') params.set('orden', 'experiencia')
    if (sort === 'slots') params.set('orden', 'disponibilidad')
    request(`/busqueda/monitores?${params}`).then(data => {
      if (!Array.isArray(data.monitores)) throw new Error('Formato de resultados no válido.')
      if (active) setItems(data.monitores)
    }).catch(err => { if (active) setError(mensajeError(err)) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [modality, minRating, sort, revision])

  useEffect(() => {
    const value = incomingQuery.trim()
    if (!value) return
    setQuery(''); setQueryTags([value]); setModality(''); setMinRating(''); setSort('best'); setSelection(null)
  }, [incomingQuery, location.key])

  const normalizar = (valor: string) => valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  const termino = queryTags.join(' ')

  const tarjetas = useMemo<Tarjeta[]>(() => {
    const resultado: Tarjeta[] = []
    items.forEach((item) => {
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
    if (sort === 'best') resultado.sort((a, b) => b.rating - a.rating)
    if (sort === 'slots') resultado.sort((a, b) => b.slots.length - a.slots.length)
    if (sort === 'rating') resultado.sort((a, b) => b.rating - a.rating)
    if (sort === 'exp') resultado.sort((a, b) => b.helped - a.helped)
    return resultado
  }, [items, termino, minRating, sort])

  const handleQuerySubmit = (searchValue?: string) => {
    const value = (searchValue ?? query).trim()
    if (!value) return
    setQueryTags(prev => prev.some(tag => tag.toLowerCase() === value.toLowerCase()) ? prev : [...prev, value])
    setQuery('')
  }

  const handleSelectSlot = (monitorId: number, slot: string) => {
    const tarjeta = tarjetas.find(item => item.id === monitorId)
    const franja: Disponibilidad | undefined = tarjeta?.resultado.disponibilidad.find(
      item => `${dia(item.fecha)} · ${item.horaInicio}–${item.horaFin}` === slot
    )
    const same = selection?.monitorId === String(monitorId) && selection.slot === slot
    setSelection(same || !franja ? null : {
      monitorId: String(monitorId),
      slot,
      disponibilidadId: id(franja),
    })
  }

  const handleSubmitRequest = async (data: SessionRequestForm) => {
    if (!requesting || sending) return
    setSending(true); setError('')
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
        disponibilidad: selection?.disponibilidadId || null,
      })
      showToast(resultado.mensaje || 'Solicitud enviada ✅')
      setRequesting(null); setSelection(null); setRevision(v => v + 1)
    } catch (err) { setError(mensajeError(err)) } finally { setSending(false) }
  }

  return (
    <DashboardLayout role="estudiante" notifications={[]}>
      <div className="student-search-page">
        <PageHero title="Encuentra tu monitor" description="Busca monitores por materia, tema, modalidad y disponibilidad." />
        <section className="student-search-page__filters">
          <SearchFilters query={query} onQueryChange={setQuery} onQuerySubmit={handleQuerySubmit} queryTags={queryTags} onRemoveQueryTag={tag => setQueryTags(prev => prev.filter(item => item !== tag))} modality={modality} onModalityChange={setModality} minRating={minRating} onMinRatingChange={setMinRating} sort={sort} onSortChange={setSort} quickSubjects={QUICK_SUBJECTS} />
        </section>
        <section className="student-search-page__results">
          <Card title="Monitores disponibles" subtitle={`${tarjetas.length} monitor${tarjetas.length !== 1 ? 'es' : ''} encontrado${tarjetas.length !== 1 ? 's' : ''}`}>
            {loading ? <p role="status">Cargando monitores...</p> : error ? <EmptyState title="No pudimos cargar los monitores" message={error} actionLabel="Reintentar" onAction={() => setRevision(v => v + 1)} /> : tarjetas.length === 0 ? <EmptyState title="No encontramos monitores" message="Prueba con otra búsqueda o modifica los filtros." actionLabel="Ver todos los monitores" onAction={() => { setQueryTags([]); setModality(''); setMinRating(''); setSort('best') }} /> : (
              <div className="student-search-page__list">
                {tarjetas.map(monitor => (
                  <MonitorCard key={`${id(monitor.resultado.monitor)}-${monitor.id}`} monitor={monitor} selectedSlot={selection?.monitorId === String(monitor.id) ? selection.slot : null} onSelectSlot={slot => handleSelectSlot(monitor.id, slot)} onReserve={() => { if (selection?.monitorId === String(monitor.id)) setRequesting(monitor) }} />
                ))}
              </div>
            )}
          </Card>
        </section>
      </div>
      {requesting && <RequestModal monitor={requesting} slot={selection?.slot || ''} onClose={() => setRequesting(null)} onSubmit={handleSubmitRequest} />}
      <Toast message={message} visible={visible} />
    </DashboardLayout>
  )
}

export default StudentSearchPage
