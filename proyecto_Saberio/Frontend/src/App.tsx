import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { api } from './services/authService'
import AppRoutes from './routes/AppRoutes'
const PUBLIC_ROUTES = new Set(['/', '/login', '/registro'])
function App() {
  const location = useLocation()
  const content = useRef<HTMLDivElement>(null)
  const pending = useRef<Promise<void> | null>(null)
  const failedClose = useRef(false)
  const [ready, setReady] = useState('')
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const publicPage = PUBLIC_ROUTES.has(location.pathname.replace(/\/+$/, '').toLowerCase() || '/')
  const gateKey = JSON.stringify([location.key, attempt])
  useEffect(() => {
    const hide = () => {
      if (content.current) content.current.style.visibility = 'hidden'
      setReady('')
    }
    const restore = () => { hide(); setAttempt(value => value + 1) }
    window.addEventListener('pagehide', hide)
    window.addEventListener('pageshow', restore)
    window.addEventListener('popstate', restore)
    return () => {
      window.removeEventListener('pagehide', hide)
      window.removeEventListener('pageshow', restore)
      window.removeEventListener('popstate', restore)
    }
  }, [])
  useEffect(() => {
    let active = true
    setError('')
    if (publicPage || failedClose.current) {
      pending.current = (pending.current || Promise.resolve()).catch(() => {}).then(async () => {
        await api('/auth/logout', {})
        localStorage.removeItem('usuario'); sessionStorage.removeItem('usuario')
        localStorage.setItem('saberio:session-closed', String(Date.now()))
        failedClose.current = false
      }).catch(err => { failedClose.current = true; throw err })
    }
    ;(pending.current || Promise.resolve()).then(() => { if (active) setReady(gateKey) })
      .catch(() => { if (active) setError('No se pudo cerrar la sesión de forma segura. Reintenta antes de continuar.') })
    return () => { active = false }
  }, [publicPage, gateKey])
  if (ready !== gateKey || error) return error ? <div role="alert"><p>{error}</p><button onClick={() => setAttempt(v => v + 1)}>Reintentar cierre seguro</button></div> : <p role="status">Preparando acceso seguro a Saberio...</p>
  return <div ref={content}><AppRoutes /></div>
}
export default App
