import { useEffect, useRef, useState } from 'react'
import { fetchSession, switchProfile } from '../../../services/authService'
import type { User } from '../../../types/auth'
import Avatar from '../Avatar/Avatar'
import './UserMenu.css'

interface UserMenuProps {
  userName: string
  userEmail: string
  userRole: string
  userInitials: string
  avatarColor?: 'primary' | 'purple' | 'blue' | 'dark'
  onSettings: () => void
  onLogout: () => void
}

function UserMenu({ userName, userEmail, userRole, userInitials, avatarColor = 'primary', onSettings, onLogout }: UserMenuProps) {
  const [open, setOpen] = useState(false)
  const [account, setAccount] = useState<User | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    let active = true
    setAccount(null); setError(''); setBusy(true)
    fetchSession().then(user => { if (active) setAccount(user) })
      .catch(err => { if (active) setError(err instanceof Error ? err.message : 'No se pudieron consultar tus roles.') })
      .finally(() => { if (active) setBusy(false) })
    const click = (event: MouseEvent) => { if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false) }
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', click); document.addEventListener('keydown', key)
    return () => { active = false; document.removeEventListener('mousedown', click); document.removeEventListener('keydown', key) }
  }, [open])
  const choose = (action: () => void) => () => { setOpen(false); action() }
  const dual = account?.roles?.includes('estudiante') && account.roles.includes('monitor')
  const target = account?.role === 'monitor' ? 'estudiante' : 'monitor'
  async function change() {
    if (busy || !dual) return
    setBusy(true); setError('')
    try { await switchProfile(target) }
    catch (err) { setError(err instanceof Error ? err.message : 'No se pudo cambiar de perfil.'); setBusy(false) }
  }
  return <div className="user-menu" ref={ref}>
    <button type="button" className="user-menu__button" aria-haspopup="menu" aria-expanded={open} aria-label="Abrir menú de mi cuenta" onClick={() => setOpen(previous => !previous)}>
      <div className="user-menu__info"><b>{userName}</b><span>{userRole}</span></div>
      <Avatar initials={userInitials} color={avatarColor} size={42} />
      <span className={`user-menu__chevron ${open ? 'is-open' : ''}`} aria-hidden="true" />
    </button>
    {open && <div className="user-menu__panel" role="menu" style={{ width: 'min(320px, calc(100vw - 32px))', maxHeight: 'calc(100dvh - 100px)', overflowY: 'auto', overflowWrap: 'anywhere' }}>
      <div className="user-menu__who"><b>{userName}</b><span>{userEmail}</span></div>
      {busy && <p role="status">Consultando perfil...</p>}
      {error && <p role="alert">{error}</p>}
      {dual && <button type="button" role="menuitem" disabled={busy} onClick={change}>Cambiar a {target}</button>}
      <button type="button" role="menuitem" disabled={busy} onClick={choose(onSettings)}>Configuración</button>
      <button type="button" role="menuitem" disabled={busy} onClick={choose(onLogout)}>Cerrar sesión</button>
    </div>}
  </div>
}
export default UserMenu
