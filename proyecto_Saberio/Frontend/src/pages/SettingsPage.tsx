import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Role } from '../types/auth'
import { ROLE_COLOR, ROLE_LABEL } from '../config/navigation'
import { getSession, logout } from '../services/authService'
import { getInitials } from '../utils/format'
import { studentNotifications } from '../data/studentMock'
import { monitorNotifications } from '../data/monitorMock'
import { adminNotifications } from '../data/adminMock'
import DashboardLayout from '../components/layout/DashboardLayout/DashboardLayout'
import PageHero from '../components/layout/PageHero/PageHero'
import Button from '../components/Button/Button'
import Card from '../components/shared/Card/Card'
import Avatar from '../components/shared/Avatar/Avatar'
import ListRow from '../components/shared/ListRow/ListRow'
import StatusBadge from '../components/shared/StatusBadge/StatusBadge'
import BackupSection from '../components/admin/BackupSection/BackupSection'

const NOTIFICATIONS_BY_ROLE = {
  estudiante: studentNotifications,
  monitor: monitorNotifications,
  admin: adminNotifications,
}

interface SettingsPageProps {
  role: Role
}

function SettingsPage({ role }: SettingsPageProps) {
  const navigate = useNavigate()
  const user = getSession()
  const inputRef = useRef<HTMLInputElement>(null)
  const [archivos, setArchivos] = useState<File[]>([])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleSeleccionarArchivos = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const archivosSeleccionados = Array.from(
      event.target.files ?? [],
    )

    setArchivos(archivosSeleccionados)
  }

  const handleAbrirSelector = () => {
    inputRef.current?.click()
  }

  return (
    <DashboardLayout
      role={role}
      notifications={NOTIFICATIONS_BY_ROLE[role]}
    >
      <PageHero
        title="Configuración"
        description="Administra tu cuenta y tu sesión. Las preferencias de notificaciones todavía no tienen persistencia en la API."
      />

      <div className="main-grid">
        <div className="stack stack--lg">
          <Card
            title="Notificaciones"
            subtitle="Estas opciones aún no se guardan en el servidor."
          >
            <div className="stack" style={{ gap: 12 }}>
              <ListRow
                title="Correo electrónico"
                subtitle="Preferencia no persistente"
                trailing={
                  <StatusBadge tone="review">Pendiente</StatusBadge>
                }
              />
            </div>
          </Card>

          {role === 'monitor' && (
            <Card title="Soportes académicos">
              <form onSubmit={event => event.preventDefault()}>
                <input
                  ref={inputRef}
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  style={{ display: 'none' }}
                  onChange={handleSeleccionarArchivos}
                />

                <div className="stack" style={{ gap: 12 }}>
                  <ListRow
                    title="Estado de tu acreditación"
                    subtitle="Estado real de tu cuenta"
                    trailing={
                      <StatusBadge
                        tone={user?.role === 'monitor' ? 'ok' : 'review'}
                      >
                        {user?.role === 'monitor' ? 'Monitor' : 'Pendiente'}
                      </StatusBadge>
                    }
                  />

                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleAbrirSelector}
                  >
                    Cargar nuevo soporte
                  </Button>

                  {archivos.length > 0 && (
                    <div>
                      <b>Documentos seleccionados:</b>

                      <ul>
                        {archivos.map(archivo => (
                          <li key={archivo.name}>
                            {archivo.name}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </form>
            </Card>
          )}

          {role === 'admin' && (
            <>
              <Card title="Seguridad">
                <p
                  style={{
                    fontSize: 14,
                    color: 'var(--texto-suave)',
                  }}
                >
                  Contraseñas almacenadas con hashing seguro,
                  comunicación cifrada por HTTPS y secretos
                  gestionados con variables de entorno.
                </p>
              </Card>

              <Card title="Respaldo de datos">
                <BackupSection />
              </Card>
            </>
          )}
        </div>

        <aside className="stack side">
          <Card title="Tu cuenta" small>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
              }}
            >
              <Avatar
                initials={getInitials(user?.name ?? '')}
                color={ROLE_COLOR[role]}
                size={56}
              />

              <div>
                <b style={{ display: 'block', fontSize: 17 }}>
                  {user?.name}
                </b>

                <span
                  style={{
                    fontSize: 14,
                    color: 'var(--texto-suave)',
                  }}
                >
                  {user?.email}
                </span>

                <div style={{ marginTop: 6 }}>
                  <StatusBadge tone="review">
                    {ROLE_LABEL[role]}
                  </StatusBadge>
                </div>
              </div>
            </div>
          </Card>

          <Card title="Sesión" small>
            <div className="stack" style={{ gap: 10 }}>
              <Button
                variant="secondary"
                onClick={handleLogout}
              >
                Cerrar sesión
              </Button>
            </div>
          </Card>
        </aside>
      </div>
    </DashboardLayout>
  )
}

export default SettingsPage