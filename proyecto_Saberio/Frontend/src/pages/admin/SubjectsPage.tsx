import { useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import AdminLayout from '../../components/admin/AdminLayout/AdminLayout'
import PageHero from '../../components/layout/PageHero/PageHero'
import Card from '../../components/shared/Card/Card'
import StatusBadge from '../../components/shared/StatusBadge/StatusBadge'
import EmptyState from '../../components/shared/EmptyState/EmptyState'
import Toast from '../../components/shared/Toast/Toast'
import Button from '../../components/Button/Button'
import FormField from '../../components/FormField/FormField'
import { useLista, request, id, datos, mensajeError } from '../../services/tutoriaService'
import type { Materia } from '../../services/tutoriaService'

const FACULTADES = ['Ingeniería', 'Economía', 'Matemáticas', 'Derecho']
const actions: CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }
const control: CSSProperties = { width: '100%', minWidth: 0, boxSizing: 'border-box', padding: 12, borderRadius: 12, border: '1px solid var(--linea)', background: '#fff', color: 'inherit', font: 'inherit' }

export default function SubjectsPage() {
  const [searchParams] = useSearchParams()
  const remote = useLista<Materia>('/materias', 'materias')
  const [selected, setSelected] = useState<Materia | 'new' | null>(searchParams.get('nueva') === '1' ? 'new' : null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || !selected) return
    const form = datos(event.currentTarget)
    const body = { nombre: String(form.nombre || '').trim(), codigo: String(form.codigo || '').trim(), facultad: String(form.facultad || ''), creditos: Number(form.creditos) }
    setError(''); setMessage('')
    if (body.nombre.length < 3 || body.nombre.length > 120) { setError('El nombre debe tener entre 3 y 120 caracteres.'); return }
    if (body.codigo.length < 2 || body.codigo.length > 20 || !FACULTADES.includes(body.facultad) || !Number.isInteger(body.creditos) || body.creditos < 1 || body.creditos > 6) { setError('Revisa el código, la facultad y los créditos.'); return }
    setBusy(true)
    try {
      const result = selected === 'new' ? await request('/materias', 'POST', body) : await request(`/materias/${encodeURIComponent(id(selected))}`, 'PUT', body)
      setMessage(result.mensaje || 'Materia guardada.'); setSelected(null); remote.refresh()
    } catch (err) { setError(mensajeError(err)) } finally { setBusy(false) }
  }

  async function toggle(m: Materia) {
    if (busy) return
    setBusy(true); setError(''); setMessage('')
    try {
      const result = await request(`/materias/${encodeURIComponent(id(m))}/estado`, 'PATCH', { activa: !m.activa })
      setMessage(result.mensaje || 'Estado actualizado.'); remote.refresh()
    } catch (err) { setError(mensajeError(err)) } finally { setBusy(false) }
  }

  const editing = selected && selected !== 'new' ? selected : null
  return <AdminLayout>
    <PageHero title="Gestión de materias" description="Catálogo real de materias disponible para monitores y estudiantes.">
      <Button disabled={busy} onClick={() => { setSelected('new'); setError(''); setMessage('') }}>+ Nueva materia</Button>
    </PageHero>
    <div className="stack stack--lg" style={{ marginTop: 24, minWidth: 0 }}>
      {message && <p role="status">{message}</p>}
      {remote.loading ? <Card title="Catálogo"><p role="status">Cargando materias...</p></Card> : remote.error ? <Card title="Materias"><EmptyState title="No se pudieron cargar las materias" message={remote.error} /><Button onClick={remote.refresh}>Reintentar</Button></Card> : <Card title="Catálogo" subtitle={`${remote.items.length} materias`}>
        {!remote.items.length && <EmptyState title="Aún no hay materias" message="Crea la primera materia del catálogo." />}
        {remote.items.map(m => <article key={id(m)} style={{ display: 'grid', gap: 12, minWidth: 0, padding: '20px 0', borderBottom: '1px solid var(--linea)', overflowWrap: 'anywhere' }}>
          <h3 style={{ margin: 0 }}>{m.nombre} ({m.codigo})</h3>
          <p>{m.facultad} · {m.creditos} créditos</p>
          <div><StatusBadge tone={m.activa ? 'ok' : 'urgent'}>{m.activa ? 'Activa' : 'Inactiva'}</StatusBadge></div>
          <div style={actions}><Button variant="secondary" disabled={busy} onClick={() => { setSelected(m); setError(''); setMessage('') }}>Editar</Button><Button variant="secondary" disabled={busy} onClick={() => toggle(m)}>{m.activa ? 'Desactivar' : 'Activar'}</Button></div>
        </article>)}
      </Card>}
      {!selected && error && <p role="alert">{error}</p>}
      {selected && <Card title={editing ? 'Editar materia' : 'Nueva materia'}>
        <form key={id(editing) || 'nueva'} onSubmit={save} style={{ display: 'grid', gap: 20, minWidth: 0 }}>
          {error && <p role="alert">{error}</p>}
          <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 20, minWidth: 0 }}>
            <FormField id="nombre" label="Nombre" name="nombre" required minLength={3} maxLength={120} defaultValue={editing?.nombre || ''} />
            <FormField id="codigo" label="Código" name="codigo" required minLength={2} maxLength={20} defaultValue={editing?.codigo || ''} />
            <label htmlFor="facultad" style={{ display: 'grid', gap: 8, minWidth: 0 }}>Facultad<select id="facultad" name="facultad" style={control} defaultValue={editing?.facultad || ''} required><option value="">Selecciona</option>{FACULTADES.map(f => <option key={f}>{f}</option>)}</select></label>
            <FormField id="creditos" label="Créditos" name="creditos" type="number" min={1} max={6} step={1} defaultValue={editing?.creditos ?? 3} required />
            <div style={actions}><Button type="submit" disabled={busy}>{busy ? 'Guardando...' : 'Guardar materia'}</Button><Button type="button" variant="secondary" disabled={busy} onClick={() => { setSelected(null); setError('') }}>Cancelar</Button></div>
          </fieldset>
        </form>
      </Card>}
    </div>
    <Toast message={message} visible={Boolean(message)} />
  </AdminLayout>
}
