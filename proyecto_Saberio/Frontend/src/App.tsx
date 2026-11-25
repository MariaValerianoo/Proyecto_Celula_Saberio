import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { api } from './services/authService'
import AppRoutes from './routes/AppRoutes'
const PUBLIC_ROUTES = new Set(['/', '/login', '/registro'])
function App() {
  const location = useLocation()
  const pending = useRef<Promise<void> | null>(null)
  const failedClose = useRef(false)
  const [ready, setReady] = useState('')
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    setError('')
    if (PUBLIC_ROUTES.has(location.pathname) || failedClose.current) {
      pending.current = (pending.current || Promise.resolve()).catch(() => {}).then(async () => {
        await api('/auth/logout', {})
        localStorage.removeItem('usuario'); sessionStorage.removeItem('usuario')
        localStorage.setItem('saberio:session-closed', String(Date.now()))
        failedClose.current = false
      }).catch(err => { failedClose.current = true; throw err })
    }
    ;(pending.current || Promise.resolve()).then(() => { if (active) setReady(location.key) })
      .catch(() => { if (active) setError('No se pudo cerrar la sesión de forma segura. Reintenta antes de continuar.') })
    return () => { active = false }
  }, [location.pathname, location.key, attempt])
  if (ready !== location.key || error) return error ? <div role="alert"><p>{error}</p><button onClick={() => setAttempt(v => v + 1)}>Reintentar cierre seguro</button></div> : <p role="status">Preparando acceso seguro a Saberio...</p>
  return <AppRoutes />
}
export default App
