import { useEffect, useState } from 'react'
import AdminLayout from '../../components/admin/AdminLayout/AdminLayout'
import PageHero from '../../components/layout/PageHero/PageHero'
import Card from '../../components/shared/Card/Card'
import EmptyState from '../../components/shared/EmptyState/EmptyState'
import StatusBadge from '../../components/shared/StatusBadge/StatusBadge'
import FormField from '../../components/FormField/FormField'
import Button from '../../components/Button/Button'
import { api } from '../../services/authService'

interface Usuario { id: string; nombre: string; correo: string; roles: string[]; estadoCuenta: string; correoVerificado: boolean; acreditacionMonitor: string }

export default function UsersPage() {
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [page, setPage] = useState(1)
  const [users, setUsers] = useState<Usuario[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true); setError(''); setUsers([])
    const timer = setTimeout(() => {
      const query = new URLSearchParams({ pagina: String(page), limite: '25', buscar: search })
      if (role) query.set('rol', role)
      api(`/admin/usuarios?${query}`).then(data => {
        if (!Array.isArray(data.usuarios) || typeof data.total !== 'number') throw new Error('Respuesta de usuarios no válida.')
        if (active) { setUsers(data.usuarios); setTotal(data.total) }
      }).catch(err => { if (active) setError(err instanceof Error ? err.message : 'No se pudieron cargar los usuarios.') })
        .finally(() => { if (active) setLoading(false) })
    }, 300)
    return () => { active = false; clearTimeout(timer) }
  }, [search, role, page, attempt])

  return <AdminLayout><PageHero title="Usuarios" description="Cuentas reales de la plataforma. Solo accesible para administradores." /><Card title="Usuarios registrados" subtitle={`${total} resultados · Página ${page}`}>
    <FormField id="buscar-usuario" label="Buscar por nombre o correo" value={search} onChange={v => { setSearch(v); setPage(1) }} />
    <label>Rol <select value={role} onChange={e => { setRole(e.target.value); setPage(1) }}><option value="">Todos</option><option value="estudiante">Estudiante</option><option value="monitor">Monitor</option><option value="admin">Administrador</option></select></label>
    {loading ? <p role="status">Cargando usuarios...</p> : error ? <div><EmptyState title="No se pudieron cargar los usuarios" message={error} /><Button onClick={() => setAttempt(v => v + 1)}>Reintentar</Button></div> : <>
      {!users.length && <EmptyState title="Sin resultados" message="No hay usuarios que coincidan con estos filtros." />}
      {users.map(u => <article key={u.id} style={{ padding: '16px 0', borderBottom: '1px solid #ddd' }}><h3>{u.nombre}</h3><p>{u.correo}</p><p>Roles: {u.roles.join(', ')}</p><StatusBadge tone={u.estadoCuenta === 'habilitada' ? 'ok' : 'urgent'}>{u.estadoCuenta}</StatusBadge><p>Correo: {u.correoVerificado ? 'Verificado' : 'Pendiente'} · Acreditación: {u.acreditacionMonitor}</p></article>)}
      <div><Button variant="secondary" disabled={page <= 1} onClick={() => setPage(v => v - 1)}>Anterior</Button><Button variant="secondary" disabled={page * 25 >= total} onClick={() => setPage(v => v + 1)}>Siguiente</Button></div>
    </>}
  </Card></AdminLayout>
}
