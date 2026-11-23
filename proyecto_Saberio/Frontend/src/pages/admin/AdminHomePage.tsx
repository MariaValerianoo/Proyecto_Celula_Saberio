import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getInitials } from '../../utils/format'
import { useToast } from '../../hooks/useToast'
import { useLista, request, id, nombre, mensajeError } from '../../services/tutoriaService'
import type { Materia, Soporte } from '../../services/tutoriaService'
import AdminLayout from '../../components/admin/AdminLayout/AdminLayout'
import PageHero from '../../components/layout/PageHero/PageHero'
import Button from '../../components/Button/Button'
import Card from '../../components/shared/Card/Card'
import StatCard from '../../components/shared/StatCard/StatCard'
import Avatar from '../../components/shared/Avatar/Avatar'
import ListRow from '../../components/shared/ListRow/ListRow'
import StatusBadge from '../../components/shared/StatusBadge/StatusBadge'
import EmptyState from '../../components/shared/EmptyState/EmptyState'
import Toast from '../../components/shared/Toast/Toast'
import ActivityList from '../../components/admin/ActivityList'
import SystemStatus from '../../components/admin/SystemStatus'

function AdminHomePage() {
  const navigate = useNavigate()
  const { message, visible, showToast } = useToast()
  const materias = useLista<Materia>('/materias', 'materias')
  const soportes = useLista<Soporte>('/soportes', 'soportes')
  const [usuarios, setUsuarios] = useState<{ total: number; monitores: number } | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    request('/admin/usuarios?pagina=1&limite=1').then(data => {
      if (typeof data.total !== 'number') throw new Error('Respuesta de usuarios no válida.')
      if (active) setUsuarios({ total: data.total, monitores: data.total })
    }).catch(err => { if (active) setError(mensajeError(err)) })
    return () => { active = false }
  }, [])

  const pendientes = soportes.items.filter(s => s.estado === 'Pendiente')
  const activas = materias.items.filter(m => m.activa).length

  return (
    <AdminLayout>
      <PageHero
        greeting="Hola, Admin 👋"
        title="Panel de Administración"
        description="Gestiona materias, verifica soportes académicos de monitores y supervisa usuarios y monitorías de la plataforma."
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 28 }}>
          <Button onClick={() => navigate('/admin/materias?nueva=1')}>+ Nueva materia</Button>
          <Button variant="secondary" onClick={() => showToast('Los reportes estarán disponibles cuando se implementen.')}>Ver reportes</Button>
        </div>
      </PageHero>

      <div className="main-grid">
        <div className="stack stack--lg">
          <div className="stats-grid stats-grid--4">
            <StatCard value={usuarios ? usuarios.total.toLocaleString('es-CO') : '—'} label="Usuarios totales" />
            <StatCard value="—" label="Monitores activos" />
            <StatCard value={materias.loading ? '—' : activas} label="Materias activas" />
            <StatCard value="—" label="Monitorías este mes" />
          </div>

          <Card title="Soportes académicos pendientes" subtitle={soportes.loading ? 'Cargando...' : `${pendientes.length} por verificar`}>
            {soportes.error ? (
              <EmptyState title="No se pudieron cargar los soportes" message={soportes.error} />
            ) : soportes.loading ? (
              <p role="status">Cargando soportes...</p>
            ) : pendientes.length === 0 ? (
              <EmptyState title="Todo verificado 🎉" message="No hay soportes pendientes." />
            ) : (
              <div className="stack" style={{ gap: 12 }}>
                {pendientes.slice(0, 4).map((s) => (
                  <ListRow
                    key={id(s)}
                    leading={<Avatar initials={getInitials(nombre(s.monitor))} color="purple" size={44} />}
                    title={nombre(s.monitor)}
                    subtitle={`${s.tipoDocumento} · ${nombre(s.materia)}`}
                    trailing={<StatusBadge tone="pending">Pendiente</StatusBadge>}
                  />
                ))}
              </div>
            )}
            <p style={{ marginTop: 16 }}>
              <Link to="/admin/soportes" style={{ color: 'var(--acento)', fontWeight: 700 }}>Verificar soportes</Link>
            </p>
          </Card>

          <Card title="Materias del catálogo">
            {materias.error ? (
              <EmptyState title="No se pudieron cargar las materias" message={materias.error} />
            ) : materias.loading ? (
              <p role="status">Cargando materias...</p>
            ) : materias.items.length === 0 ? (
              <EmptyState title="Sin materias" message="Aún no hay materias registradas." />
            ) : (
              <div className="stack" style={{ gap: 12 }}>
                {materias.items.slice(0, 4).map((m) => (
                  <ListRow
                    key={id(m)}
                    title={`${m.nombre} (${m.codigo})`}
                    subtitle={`${m.facultad} · ${m.creditos} créditos`}
                    trailing={<StatusBadge tone={m.activa ? 'ok' : 'urgent'}>{m.activa ? 'Activa' : 'Inactiva'}</StatusBadge>}
                  />
                ))}
              </div>
            )}
          </Card>
        </div>

        <aside className="stack side">
          <Card title="Accesos rápidos" small>
            <div className="stack" style={{ gap: 10 }}>
              <Button variant="secondary" onClick={() => navigate('/admin/soportes')}>Ver soportes pendientes</Button>
              <Button variant="secondary" onClick={() => navigate('/admin/materias')}>Gestionar materias</Button>
              <Button variant="secondary" onClick={() => navigate('/admin/usuarios')}>Ver usuarios</Button>
              <Button variant="secondary" onClick={() => navigate('/admin/monitorias')}>Supervisar monitorías</Button>
            </div>
          </Card>

          <Card title="Actividad reciente" small>
            <ActivityList items={[]} />
          </Card>

          <Card title="Estado del sistema" small>
            <SystemStatus
              items={[
                { label: 'Soportes por verificar', value: soportes.loading ? '—' : pendientes.length, tone: soportes.loading ? undefined : (pendientes.length ? 'review' : 'ok') },
                { label: 'Materias activas', value: materias.loading ? '—' : activas, tone: materias.loading ? undefined : 'ok' },
                { label: 'Usuarios totales', value: usuarios ? usuarios.total : '—' },
              ]}
            />
          </Card>
        </aside>
      </div>

      {error && <p role="alert">{error}</p>}
      <Toast message={message} visible={visible} />
    </AdminLayout>
  )
}

export default AdminHomePage
