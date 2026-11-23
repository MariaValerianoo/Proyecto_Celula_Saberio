import { useState } from 'react'
import { getInitials } from '../../utils/format'
import { useToast } from '../../hooks/useToast'
import { useLista, request, id, nombre, mensajeError } from '../../services/tutoriaService'
import type { Soporte } from '../../services/tutoriaService'
import AdminLayout from '../../components/admin/AdminLayout/AdminLayout'
import PageHero from '../../components/layout/PageHero/PageHero'
import Card from '../../components/shared/Card/Card'
import Avatar from '../../components/shared/Avatar/Avatar'
import ListRow from '../../components/shared/ListRow/ListRow'
import StatusBadge from '../../components/shared/StatusBadge/StatusBadge'
import EmptyState from '../../components/shared/EmptyState/EmptyState'
import Toast from '../../components/shared/Toast/Toast'
import SupportDetailModal from '../../components/admin/SupportDetailModal'

function SupportsPage() {
  const { message, visible, showToast } = useToast()
  const remote = useLista<Soporte>('/soportes', 'soportes')
  const [selected, setSelected] = useState<Soporte | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const pendientes = remote.items.filter((s) => s.estado === 'Pendiente')
  const revisados = remote.items.filter((s) => s.estado !== 'Pendiente')

  async function resolver(estado: 'Aprobado' | 'Rechazado', observaciones = '') {
    if (!selected || busy) return
    setBusy(true); setError('')
    try {
      const result = await request(`/soportes/${encodeURIComponent(id(selected))}/revision`, 'PATCH', { estado, observacionesAdmin: observaciones })
      showToast(result.mensaje || `Soporte ${estado.toLowerCase()}.`)
      setSelected(null); remote.refresh()
    } catch (err) { setError(mensajeError(err)) } finally { setBusy(false) }
  }

  const renderRow = (s: Soporte) => (
    <ListRow
      key={id(s)}
      leading={<Avatar initials={getInitials(nombre(s.monitor))} color="purple" size={44} />}
      title={nombre(s.monitor)}
      subtitle={`${s.tipoDocumento} · ${nombre(s.materia)}${s.createdAt ? ` · ${s.createdAt.slice(0, 10)}` : ''}`}
      trailing={
        <StatusBadge tone={s.estado === 'Pendiente' ? 'pending' : s.estado === 'Aprobado' ? 'ok' : 'urgent'}>
          {s.estado}
        </StatusBadge>
      }
      onClick={() => { setSelected(s); setError('') }}
    />
  )

  return (
    <AdminLayout>
      <PageHero title="Soportes académicos" description="Verifica los documentos que cargan los monitores para acreditarse." />

      {error && <p role="alert">{error}</p>}

      <div className="stack stack--lg" style={{ marginTop: 48 }}>
        <Card title="Pendientes" subtitle={remote.loading ? 'Cargando...' : `${pendientes.length} por verificar`}>
          {remote.error ? (
            <EmptyState title="No se pudieron cargar los soportes" message={remote.error} />
          ) : remote.loading ? (
            <p role="status">Cargando soportes...</p>
          ) : pendientes.length === 0 ? (
            <EmptyState title="No hay soportes pendientes 🎉" message="Todos los documentos fueron revisados." />
          ) : (
            <div className="stack" style={{ gap: 12 }}>{pendientes.map(renderRow)}</div>
          )}
        </Card>

        <Card title="Revisados" subtitle={remote.loading ? 'Cargando...' : `${revisados.length} soportes`}>
          {remote.error ? (
            <EmptyState title="No se pudieron cargar los soportes" message={remote.error} />
          ) : remote.loading ? (
            <p role="status">Cargando soportes...</p>
          ) : revisados.length === 0 ? (
            <EmptyState title="Aún no hay revisados" message="Los soportes que apruebes o rechaces aparecerán aquí." />
          ) : (
            <div className="stack" style={{ gap: 12 }}>{revisados.map(renderRow)}</div>
          )}
        </Card>
      </div>

      {selected && (
        <SupportDetailModal
          support={{
            id: id(selected),
            monitor: nombre(selected.monitor),
            email: '',
            subject: nombre(selected.materia),
            kind: selected.tipoDocumento,
            date: selected.createdAt?.slice(0, 10) || '',
            status: selected.estado,
            fileName: selected.nombreOriginal,
            fileSize: selected.tamanoBytes,
            downloadUrl: `/api/soportes/${encodeURIComponent(id(selected))}/descargar`,
          }}
          onClose={() => setSelected(null)}
          onApprove={() => resolver('Aprobado')}
          onReject={(reason) => resolver('Rechazado', reason)}
        />
      )}

      <Toast message={message} visible={visible} />
    </AdminLayout>
  )
}

export default SupportsPage
