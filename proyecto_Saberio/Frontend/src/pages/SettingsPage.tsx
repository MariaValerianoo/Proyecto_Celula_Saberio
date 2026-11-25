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
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFileName, setSelectedFileName] = useState('')
  const [supportMessage, setSupportMessage] = useState('')

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleOpenFileSelector = () => {
    fileInputRef.current?.click()
  }

  const handleFileSelected = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]

    if (!file) {
      setSelectedFileName('')
      setSupportMessage('')
      return
    }

    setSelectedFileName(file.name)
    setSupportMessage(
      'Soporte seleccionado. La carga definitiva al servidor requiere conectar el endpoint de soportes.'
    )

    event.target.value = ''
  }

  return (
    <DashboardLayout role={role} notifications={NOTIFICATIONS_BY_ROLE[role]}>
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

              <div
                style={{
                  marginTop: 16,
                  display: 'grid',
                  gap: 12,
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={handleFileSelected}
                  style={{ display: 'none' }}
                />

                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleOpenFileSelector}
                >
                  Cargar nuevo soporte
                </Button>

                {selectedFileName && (
                  <p style={{ fontSize: 14, color: 'var(--texto-suave)' }}>
                    Archivo seleccionado: <b>{selectedFileName}</b>
                  </p>
                )}

                {supportMessage && (
                  <p role="status" style={{ fontSize: 14 }}>
                    {supportMessage}
                  </p>
                )}
              </div>
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
                  Contraseñas almacenadas con hashing seguro, comunicación
                  cifrada por HTTPS y secretos gestionados con variables de
                  entorno.
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
                <b
                  style={{
                    display: 'block',
                    fontSize: 17,
                  }}
                >
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