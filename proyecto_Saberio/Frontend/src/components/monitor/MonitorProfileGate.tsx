import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { ApiError, getSession, switchProfile } from '../../services/authService'
import { request, mensajeError } from '../../services/tutoriaService'
import MonitorLayout from './MonitorLayout/MonitorLayout'
import Card from '../shared/Card/Card'
import Button from '../Button/Button'
import MonitorProfilePage, { perfilCompleto } from '../../pages/monitor/MonitorProfilePage'

export default function MonitorProfileGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [switching, setSwitching] = useState(false)
  const [switchError, setSwitchError] = useState('')

  useEffect(() => {
    let active = true

    setLoading(true)
    setError('')
    setReady(false)

    request('/perfiles/monitor')
      .then(data => {
        if (active) {
          setReady(perfilCompleto(data.perfil))
        }
      })
      .catch(err => {
        if (!active) return

        if (
          err instanceof ApiError &&
          err.status === 404 &&
          err.code === 'PERFIL_NO_ENCONTRADO'
        ) {
          setReady(false)
        } else {
          setError(mensajeError(err))
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [attempt])

  async function changeToStudent() {
    if (switching) return

    setSwitching(true)
    setSwitchError('')

    try {
      await switchProfile('estudiante')
    } catch (err) {
      setSwitchError(mensajeError(err))
    } finally {
      setSwitching(false)
    }
  }

  if (loading) {
    return (
      <MonitorLayout>
        <Card title="Tu perfil de monitor">
          <p role="status">Cargando tu perfil...</p>
        </Card>
      </MonitorLayout>
    )
  }

  if (error) {
    return (
      <MonitorLayout>
        <Card title="No pudimos cargar tu perfil">
          <p role="alert">{error}</p>

          <Button onClick={() => setAttempt(value => value + 1)}>
            Reintentar
          </Button>
        </Card>
      </MonitorLayout>
    )
  }

  if (!ready) {
    return <MonitorProfilePage initial onSaved={() => setReady(true)} />
  }

  const user = getSession()
  const canSwitch = !!user?.roles?.includes('estudiante')

  return (
    <>
      {canSwitch && (
        <div
          style={{
            position: 'fixed',
            top: 16,
            right: 16,
            zIndex: 60,
          }}
        >
          <Button
            type="button"
            onClick={changeToStudent}
            disabled={switching}
          >
            {switching ? 'Cambiando...' : 'Cambiar a estudiante'}
          </Button>
        </div>
      )}

      {switchError && (
        <div
          style={{
            position: 'fixed',
            top: 64,
            right: 16,
            zIndex: 60,
          }}
        >
          <p role="alert">{switchError}</p>
        </div>
      )}

      {children}
    </>
  )
}