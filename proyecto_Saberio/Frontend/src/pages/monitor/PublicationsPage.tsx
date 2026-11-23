import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { Modality, Publication } from '../../types/monitoring'
import { useToast } from '../../hooks/useToast'
import MonitorLayout from '../../components/monitor/MonitorLayout/MonitorLayout'
import PageHero from '../../components/layout/PageHero/PageHero'
import Button from '../../components/Button/Button'
import Card from '../../components/shared/Card/Card'
import EmptyState from '../../components/shared/EmptyState/EmptyState'
import ConfirmDialog from '../../components/shared/ConfirmDialog'
import Toast from '../../components/shared/Toast/Toast'
import PublicationCard from '../../components/monitor/PublicationCard/PublicationCard'
import PublicationModal from '../../components/monitor/PublicationModal'
import type { PublicacionFormReal } from '../../components/monitor/PublicationModal'
import { useLista, request, id, nombre, mensajeError } from '../../services/tutoriaService'
import type { Ref } from '../../services/tutoriaService'

interface Publicacion { id?: string; _id?: string; materia: Ref; descripcion: string; modalidad: string; tarifaPorHora: number; duracionMinutos: number; activa: boolean }

function adaptar(p: Publicacion, indice: number): Publication {
  return { id: indice, subject: nombre(p.materia), description: p.descripcion, modality: p.modalidad as Modality, rate: p.tarifaPorHora, duration: p.duracionMinutos, active: p.activa }
}

export default function PublicationsPage() {
  const [searchParams] = useSearchParams()
  const { message, visible, showToast } = useToast()
  const remote = useLista<Publicacion>('/publicaciones/propias', 'publicaciones')
  const [modal, setModal] = useState<Publicacion | 'new' | null>(searchParams.get('nueva') === '1' ? 'new' : null)
  const [toDelete, setToDelete] = useState<Publicacion | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function guardar(datos: PublicacionFormReal) {
    if (busy) return
    setBusy(true); setError('')
    const body = { materia: datos.materiaId, descripcion: datos.descripcion, modalidad: datos.modalidad, tarifaPorHora: datos.tarifaPorHora, duracionMinutos: datos.duracionMinutos }
    try {
      const result = modal === 'new' ? await request('/publicaciones', 'POST', body) : await request(`/publicaciones/${encodeURIComponent(id(modal as Publicacion))}`, 'PUT', body)
      showToast(result.mensaje || 'Publicación guardada ✅'); setModal(null); remote.refresh()
    } catch (err) { setError(mensajeError(err)) } finally { setBusy(false) }
  }

  async function eliminar() {
    if (!toDelete || busy) return
    setBusy(true); setError('')
    try {
      const result = await request(`/publicaciones/${encodeURIComponent(id(toDelete))}`, 'DELETE')
      showToast(result.mensaje || 'Publicación eliminada'); setToDelete(null); remote.refresh()
    } catch (err) { setError(mensajeError(err)) } finally { setBusy(false) }
  }

  const editando = modal && modal !== 'new' ? modal as Publicacion : null

  return (
    <MonitorLayout>
      <PageHero title="Tus publicaciones" description="Estas son las monitorías que ofreces a los estudiantes.">
        <div style={{ marginTop: 28 }}><Button onClick={() => { setModal('new'); setError('') }}>+ Nueva publicación</Button></div>
      </PageHero>
      {error && <p role="alert">{error}</p>}
      <div style={{ marginTop: 48 }}>
        <Card title="Publicaciones" subtitle={`${remote.items.length} publicación${remote.items.length !== 1 ? 'es' : ''}`}>
          {remote.loading ? <p role="status">Cargando publicaciones...</p> : remote.error ? <EmptyState title="No pudimos cargar" message={remote.error} actionLabel="Reintentar" onAction={remote.refresh} /> : remote.items.length === 0 ? (
            <EmptyState title="Aún no tienes publicaciones" message="Crea la primera para que los estudiantes te encuentren." actionLabel="Crear publicación" onAction={() => setModal('new')} />
          ) : (
            <div className="stack" style={{ gap: 16 }}>
              {remote.items.map((p, i) => <PublicationCard key={id(p)} publication={adaptar(p, i + 1)} onEdit={() => setModal(p)} onDelete={() => setToDelete(p)} />)}
            </div>
          )}
        </Card>
      </div>
      {modal && (
        <PublicationModal
          materiaIdInicial={editando ? id(editando.materia) : ''}
          descripcionInicial={editando?.descripcion || ''}
          modalidadInicial={editando?.modalidad as Modality | undefined}
          tarifaInicial={editando?.tarifaPorHora ?? 0}
          duracionInicial={editando?.duracionMinutos ?? 60}
          onClose={() => setModal(null)}
          onSave={guardar}
        />
      )}
      {toDelete && <ConfirmDialog title="Eliminar publicación" message={`¿Seguro que quieres eliminar la publicación de ${nombre(toDelete.materia)}?`} confirmLabel="Eliminar" onConfirm={eliminar} onCancel={() => setToDelete(null)} />}
      <Toast message={message} visible={visible} />
    </MonitorLayout>
  )
}
