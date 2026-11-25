import { useEffect, useState } from 'react'
export default function NotificationPreferences() {
  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/notificaciones/preferencias', { credentials: 'include', cache: 'no-store', signal: controller.signal }).then(async r => {
      const d = await r.json(); if (!r.ok || typeof d?.preferencias?.notificacionesInternas !== 'boolean') throw new Error('No se pudieron consultar las preferencias.')
      setEnabled(d.preferencias.notificacionesInternas)
    }).catch(e => { if (e.name !== 'AbortError') setError(e.message) })
    return () => controller.abort()
  }, [])
  async function change() {
    if (busy || enabled === null) return
    setBusy(true); setError('')
    try {
      const r = await fetch('/api/notificaciones/preferencias', { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notificacionesInternas: !enabled }) })
      const d = await r.json(); if (!r.ok || typeof d?.preferencias?.notificacionesInternas !== 'boolean') throw new Error(d?.error?.mensaje || 'No se pudo guardar la preferencia.')
      setEnabled(d.preferencias.notificacionesInternas)
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo guardar.') }
    finally { setBusy(false) }
  }
  return <section aria-label="Preferencias de notificaciones"><label><input type="checkbox" checked={enabled === true} disabled={busy || enabled === null} onChange={() => { void change() }} />Recibir nuevas notificaciones internas</label><p>Desactivar no elimina las notificaciones anteriores y no modifica tus correos.</p>{error && <p role="alert">{error}</p>}</section>
}
