import { useState } from 'react'
import type { FormEvent } from 'react'
import AdminLayout from '../../components/admin/AdminLayout/AdminLayout'
import PageHero from '../../components/layout/PageHero/PageHero'
import Card from '../../components/shared/Card/Card'
import StatusBadge from '../../components/shared/StatusBadge/StatusBadge'
import Toast from '../../components/shared/Toast/Toast'
import { useLista, request, id, nombre, mensajeError } from '../../services/tutoriaService'
import type { Soporte } from '../../services/tutoriaService'
export default function SupportsPage() {
  const remote = useLista<Soporte>('/soportes', 'soportes')
  const [selected, setSelected] = useState<Soporte | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  async function resolve(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selected || busy) return
    const form = new FormData(event.currentTarget); setBusy(true); setError(''); setMessage('')
    try {
      const result = await request(`/soportes/${encodeURIComponent(id(selected))}/revision`, 'PATCH', { estado: form.get('estado'), motivoRechazo: form.get('motivo') || '' })
      setMessage(result.mensaje || 'Soporte revisado.'); setSelected(null); remote.refresh()
    } catch (err) { setError(mensajeError(err)) } finally { setBusy(false) }
  }
  return <AdminLayout><PageHero title="Soportes académicos" description="Documentos reales enviados por monitores para su acreditación." />
    {message && <p role="status">{message}</p>}{error && <p role="alert">{error}</p>}
    {remote.loading ? <p role="status">Cargando soportes...</p> : remote.error ? <div role="alert"><p>{remote.error}</p><button onClick={remote.refresh}>Reintentar</button></div> : <Card title="Soportes">
      {!remote.items.length && <p>No hay soportes registrados.</p>}
      {remote.items.map(s => <article key={id(s)} style={{ padding: '16px 0', borderBottom: '1px solid #ddd' }}><h3>{s.titulo || 'Soporte académico'}</h3><p>Monitor: {nombre(s.monitor)}</p><p>{s.descripcion}</p><StatusBadge tone={s.estado === 'aprobado' ? 'ok' : s.estado === 'rechazado' ? 'urgent' : 'pending'}>{s.estado || 'Pendiente'}</StatusBadge><p><a href={`/api/soportes/${encodeURIComponent(id(s))}/descargar`}>Descargar</a></p>{s.estado === 'pendiente' && <button disabled={busy} onClick={() => { setSelected(s); setError('') }}>Revisar</button>}</article>)}
    </Card>}
    {selected && <Card title="Revisar soporte"><form onSubmit={resolve}><label>Decisión <select name="estado" required><option value="aprobado">Aprobar</option><option value="rechazado">Rechazar</option></select></label><label>Motivo del rechazo <textarea name="motivo" maxLength={500} /></label><button type="submit" disabled={busy}>{busy ? 'Guardando...' : 'Guardar revisión'}</button><button type="button" disabled={busy} onClick={() => setSelected(null)}>Cancelar</button></form></Card>}
    <Toast message={message} visible={Boolean(message)} />
  </AdminLayout>
}
