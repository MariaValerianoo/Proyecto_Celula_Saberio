import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { AppNotification } from '../../../types/notification'
import Modal from '../../Modal/Modal'
import './NotificationBell.css'
interface NotificationBellProps { notifications: AppNotification[] }
interface Aviso extends AppNotification { evento: string }
export default function NotificationBell(_props: NotificationBellProps) {
  const navigate = useNavigate()
  const [items, setItems] = useState<Aviso[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<Aviso | null>(null)
  const [revision, setRevision] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const version = useRef(0)
  const lock = useRef(false)
  const unread = items.filter(n => !n.read).length
  useEffect(() => {
    let active = true
    let running = false
    let controller: AbortController | null = null
    async function refresh() {
      if (running || lock.current || document.visibilityState === 'hidden') return
      running = true
      const current = version.current
      controller = new AbortController()
      try {
        const response = await fetch('/api/notificaciones', { credentials: 'include', cache: 'no-store', signal: controller.signal })
        const data = await response.json().catch(() => null)
        if (!response.ok) throw new Error(data?.error?.mensaje || 'No se pudieron consultar las notificaciones.')
        if (!Array.isArray(data?.notificaciones) || data.notificaciones.some((n: Aviso) => typeof n.evento !== 'string' || typeof n.title !== 'string' || typeof n.text !== 'string')) throw new Error('Respuesta de notificaciones no válida.')
        if (active && current === version.current) { setItems(data.notificaciones); setError('') }
      } catch (err) {
        if (active && current === version.current && !(err instanceof Error && err.name === 'AbortError')) setError(err instanceof Error ? err.message : 'No se pudieron consultar las notificaciones.')
      } finally { running = false; if (active) setLoading(false) }
    }
    void refresh()
    const timer = window.setInterval(() => { void refresh() }, 30000)
    const focus = () => { void refresh() }
    window.addEventListener('focus', focus)
    document.addEventListener('visibilitychange', focus)
    return () => { active = false; controller?.abort(); window.clearInterval(timer); window.removeEventListener('focus', focus); document.removeEventListener('visibilitychange', focus) }
  }, [revision])
  useEffect(() => {
    if (!open) return
    const click = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', click); document.addEventListener('keydown', key)
    return () => { document.removeEventListener('mousedown', click); document.removeEventListener('keydown', key) }
  }, [open])
  async function mark(eventos: string[]) {
    if (!eventos.length || lock.current) return
    lock.current = true; setBusy(true); version.current += 1
    try {
      const response = await fetch('/api/notificaciones/leer', { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ eventos }) })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error?.mensaje || 'No se pudo guardar el estado de lectura.')
      setItems(prev => prev.map(n => eventos.includes(n.evento) ? { ...n, read: true } : n)); setError('')
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo guardar la lectura.') }
    finally { lock.current = false; setBusy(false) }
  }
  const date = (value: string) => { const d = new Date(value); return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('es-CO') }
  return <>
    <div className="bell" ref={ref}>
      <button type="button" className="bell__button" aria-label={`Notificaciones, ${unread} sin leer`} aria-expanded={open} onClick={() => { setOpen(v => !v); if (!open) setRevision(v => v + 1) }}>
        <svg className="mi-campana" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M10 21h4" /></svg>
        {unread > 0 && <i>{unread > 99 ? '99+' : unread}</i>}
      </button>
      {open && <div className="bell__panel">
        <header className="bell__header"><h4>Notificaciones</h4><div className="bell__header-actions">
          <button type="button" className="bell__mark-all" disabled={busy || !unread} onClick={() => { void mark(items.filter(n => !n.read).map(n => n.evento)) }}>Marcar todo como leído</button>
          <button type="button" className="bell__close" aria-label="Cerrar notificaciones" onClick={() => setOpen(false)}>×</button>
        </div></header>
        {error && <div role="alert"><p>{error}</p><button type="button" disabled={busy} onClick={() => setRevision(v => v + 1)}>Reintentar consulta</button></div>}
        {loading && <p role="status">Cargando notificaciones...</p>}
        <div className="bell__list">
          {!loading && !error && !items.length && <p className="bell__empty">No tienes notificaciones de soportes.</p>}
          {items.map(n => <button type="button" disabled={busy} className={`bell__item ${n.read ? 'is-read' : 'is-unread'}`} key={n.evento} onClick={() => { setSelected(n); setOpen(false); if (!n.read) void mark([n.evento]) }}>
            <span className={`bell__icon bell__icon--${n.type}`} aria-hidden="true">{n.type === 'success' ? '✓' : n.type === 'warning' ? '!' : '↑'}</span>
            <div className="bell__content"><b>{n.title}</b><p>{n.text}</p><time>{date(n.time)}</time></div>
            {!n.read && <span className="bell__unread-dot" aria-label="No leída" />}
          </button>)}
        </div>
      </div>}
    </div>
    {selected && <Modal open title={selected.title} onClose={() => setSelected(null)} footer={<><button type="button" onClick={() => setSelected(null)}>Cerrar</button>{selected.href && <button type="button" onClick={() => { const href = selected.href; setSelected(null); if (href) navigate(href) }}>Ir a la sección</button>}</>}>
      <p style={{ whiteSpace: 'pre-line' }}>{selected.details || selected.text}</p><time>{date(selected.time)}</time>
      {error && <div role="alert"><p>{error}</p><button type="button" disabled={busy} onClick={() => { void mark([selected.evento]) }}>Reintentar marcar como leída</button></div>}
    </Modal>}
  </>
}
