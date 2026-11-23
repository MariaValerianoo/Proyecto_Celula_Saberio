import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import type { Role, User } from '../types/auth'
import { fetchSession } from '../services/authService'
import { ROLE_HOME } from '../config/navigation'
import StudentProfileFlow from '../components/estudiante/StudentProfileFlow'
import MonitorProfileGate from '../components/monitor/MonitorProfileGate'
export default function ProtectedRoute({ role }: { role: Role }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    setLoading(true); setError('')
    fetchSession().then(value => { if (active) setUser(value) })
      .catch(() => { if (active) setError('No se pudo comprobar la sesión. Revisa tu conexión.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [attempt, role])
  if (loading) return <p role="status">Comprobando sesión...</p>
  if (error) return <div role="alert"><p>{error}</p><button onClick={() => setAttempt(v => v + 1)}>Reintentar</button></div>
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== role) return <Navigate to={ROLE_HOME[user.role]} replace />
  if (role === 'estudiante') return <StudentProfileFlow key={user.email}><Outlet /></StudentProfileFlow>
  if (role === 'monitor') return <MonitorProfileGate key={user.email}><Outlet /></MonitorProfileGate>
  return <Outlet />
}
