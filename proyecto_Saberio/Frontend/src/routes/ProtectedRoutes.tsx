import { useEffect, useRef, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import type { Role, User } from '../types/auth'
import { fetchSession } from '../services/authService'
import { ROLE_HOME } from '../config/navigation'
import StudentProfileFlow from '../components/estudiante/StudentProfileFlow'
import MonitorProfileGate from '../components/monitor/MonitorProfileGate'
export default function ProtectedRoute({ role }: { role: Role }) {
  const location = useLocation()
  const content = useRef<HTMLDivElement>(null)
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<{ user: User | null; key: string; error: string }>({ user: null, key: '', error: '' })
  useEffect(() => {
    let active = true
    setState({ user: null, key: '', error: '' })
    fetchSession().then(user => { if (active) setState({ user, key: location.key, error: '' }) })
      .catch(() => { if (active) setState({ user: null, key: location.key, error: 'No se pudo comprobar la sesión. No se mostrarán datos privados hasta verificarla.' }) })
    return () => { active = false }
  }, [attempt, role, location.key])
  useEffect(() => {
    const hide = () => { if (content.current) content.current.style.visibility = 'hidden' }
    const recheck = () => {
      if (document.visibilityState === 'hidden') return
      hide(); setState({ user: null, key: '', error: '' }); setAttempt(v => v + 1)
    }
    const storage = (e: StorageEvent) => { if (e.key === 'saberio:session-closed' || e.key === null) recheck() }
    window.addEventListener('pagehide', hide); window.addEventListener('pageshow', recheck)
    window.addEventListener('focus', recheck); window.addEventListener('storage', storage)
    document.addEventListener('visibilitychange', recheck)
    return () => {
      window.removeEventListener('pagehide', hide); window.removeEventListener('pageshow', recheck)
      window.removeEventListener('focus', recheck); window.removeEventListener('storage', storage)
      document.removeEventListener('visibilitychange', recheck)
    }
  }, [])
  if (state.key !== location.key) return <p role="status">Comprobando sesión...</p>
  if (state.error) return <div role="alert"><p>{state.error}</p><button onClick={() => setAttempt(v => v + 1)}>Reintentar</button></div>
  if (!state.user) return <Navigate to="/login" replace />
  if (state.user.role !== role) return <Navigate to={ROLE_HOME[state.user.role]} replace />
  return <div ref={content}>
    {role === 'estudiante' ? <StudentProfileFlow key={state.user.email}><Outlet /></StudentProfileFlow> : role === 'monitor' ? <MonitorProfileGate key={state.user.email}><Outlet /></MonitorProfileGate> : <Outlet />}
  </div>
}
