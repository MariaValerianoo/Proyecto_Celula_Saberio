import { useState } from 'react'
import { useLista, id, nombre } from '../../services/tutoriaService'
import type { Sesion } from '../../services/tutoriaService'
import AdminLayout from '../../components/admin/AdminLayout/AdminLayout'
import PageHero from '../../components/layout/PageHero/PageHero'
import Card from '../../components/shared/Card/Card'
import StatusBadge from '../../components/shared/StatusBadge/StatusBadge'
import EmptyState from '../../components/shared/EmptyState/EmptyState'
import FilterTabs from '../../components/shared/FilterTabs/FilterTabs'
import DataTable from '../../components/shared/DataTable/DataTable'
import type { Column } from '../../components/shared/DataTable/DataTable'

const STATUS_FILTERS = [
  { value: 'todas', label: 'Todas' },
  { value: 'Confirmada', label: 'Confirmadas' },
  { value: 'Realizada', label: 'Realizadas' },
  { value: 'Cancelada', label: 'Canceladas' },
]

const columns: Column<Sesion>[] = [
  { header: 'Estudiante', render: (s) => nombre(s.estudiante) },
  { header: 'Monitor', render: (s) => nombre(s.monitor) },
  { header: 'Materia', render: (s) => nombre(s.materia) },
  { header: 'Fecha', render: (s) => `${s.fecha} ${s.hora}` },
  { header: 'Estado', render: (s) => <StatusBadge tone={s.estado === 'Realizada' ? 'ok' : s.estado === 'Cancelada' ? 'urgent' : 'pending'}>{s.estado}</StatusBadge> },
]

function AdminSessionsPage() {
  const [status, setStatus] = useState('todas')
  const remote = useLista<Sesion>('/sesiones', 'sesiones')
  const rows = remote.items.filter((s) => status === 'todas' || s.estado === status)

  return (
    <AdminLayout>
      <PageHero title="Monitorías" description="Supervisa las monitorías de toda la plataforma." />

      <div style={{ marginTop: 48 }}>
        <Card title="Monitorías recientes" subtitle={remote.loading ? 'Cargando...' : `${rows.length} registro${rows.length !== 1 ? 's' : ''}`}>
          <FilterTabs label="Filtrar por estado" options={STATUS_FILTERS} value={status} onChange={setStatus} />
          {remote.error ? <EmptyState title="No se pudieron cargar las monitorías" message={remote.error} /> : remote.loading ? <p role="status">Cargando monitorías...</p> : (
            <DataTable columns={columns} rows={rows} getKey={(s) => id(s)} emptyMessage="No hay monitorías con ese estado." />
          )}
        </Card>
      </div>
    </AdminLayout>
  )
}

export default AdminSessionsPage
