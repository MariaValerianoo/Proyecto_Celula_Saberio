import { useState } from 'react'
import type { FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import AdminLayout from '../../components/admin/AdminLayout/AdminLayout'
import PageHero from '../../components/layout/PageHero/PageHero'
import Card from '../../components/shared/Card/Card'
import StatusBadge from '../../components/shared/StatusBadge/StatusBadge'
import Toast from '../../components/shared/Toast/Toast'
import { useLista, request, id, datos, mensajeError } from '../../services/tutoriaService'
import type { Materia } from '../../services/tutoriaService'
const FACULTADES = ['Ingeniería', 'Economía', 'Matemáticas', 'Derecho']
export default function SubjectsPage() {
  const [searchParams] = useSearchParams()
  const remote = useLista<Materia>('/materias', 'materias')
  const [selected, setSelected] = useState<Materia | 'new' | null>(searchParams.get('nueva') === '1' ? 'new' : null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return
    const form = datos(event.currentTarget); setBusy(true); setError(''); setMessage('')
    const body = { nombre: form.nombre, codigo: form.codigo, facultad: form.facultad, creditos: Number(form.creditos) }
    try {
      const result = selected === 'new' ? await request('/materias', 'POST', body) : await request(`/materias/${encodeURIComponent(id(selected as Materia))}`, 'PUT', body)
      setMessage(result.mensaje || 'Materia guardada.'); setSelected(null); remote.refresh()
    } catch (err) { setError(mensajeError(err)) } finally { setBusy(false) }
  }
  async function toggle(m: Materia) {
    if (busy) return; setBusy(true); setError(''); setMessage('')
    try {
      const result = await request(`/materias/${encodeURIComponent(id(m))}/estado`, 'PATCH', { activa: !m.activa })
      setMessage(result.mensaje || 'Estado actualizado.'); remote.refresh()
    } catch (err) { setError(mensajeError(err)) } finally { setBusy(false) }
  }
  const editing = selected && selected !== 'new' ? selected as Materia : null
  return <AdminLayout><PageHero title="Gestión de materias" description="Catálogo real de materias disponible para monitores y estudiantes."><button onClick={() => { setSelected('new'); setError('') }}>+ Nueva materia</button></PageHero>
    {message && <p role="status">{message}</p>}{error && <p role="alert">{error}</p>}
    {remote.loading ? <p role="status">Cargando materias...</p> : remote.error ? <div role="alert"><p>{remote.error}</p><button onClick={remote.refresh}>Reintentar</button></div> : <Card title="Catálogo" subtitle={`${remote.items.length} materias`}>
      {!remote.items.length && <p>Aún no hay materias.</p>}
      {remote.items.map(m => <article key={id(m)} style={{ padding: '16px 0', borderBottom: '1px solid #ddd' }}><h3>{m.nombre} ({m.codigo})</h3><p>{m.facultad} · {m.creditos} créditos</p><StatusBadge tone={m.activa ? 'ok' : 'urgent'}>{m.activa ? 'Activa' : 'Inactiva'}</StatusBadge><div><button disabled={busy} onClick={() => { setSelected(m); setError('') }}>Editar</button><button disabled={busy} onClick={() => toggle(m)}>{m.activa ? 'Desactivar' : 'Activar'}</button></div></article>)}
    </Card>}
    {selected && <Card title={editing ? 'Editar materia' : 'Nueva materia'}><form key={id(editing) || 'nueva'} onSubmit={save}><label>Nombre <input name="nombre" required minLength={3} maxLength={120} defaultValue={editing?.nombre || ''} /></label><label>Código <input name="codigo" required minLength={2} maxLength={20} defaultValue={editing?.codigo || ''} /></label><label>Facultad <select name="facultad" defaultValue={editing?.facultad || ''} required><option value="">Selecciona</option>{FACULTADES.map(f => <option key={f}>{f}</option>)}</select></label><label>Créditos <input type="number" name="creditos" min={1} max={6} step={1} defaultValue={editing?.creditos || 3} required /></label><button type="submit" disabled={busy}>{busy ? 'Guardando...' : 'Guardar materia'}</button><button type="button" disabled={busy} onClick={() => setSelected(null)}>Cancelar</button></form></Card>}
    <Toast message={message} visible={Boolean(message)} />
  </AdminLayout>
}
