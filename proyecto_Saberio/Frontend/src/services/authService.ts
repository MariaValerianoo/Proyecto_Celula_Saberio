import type { RegisterData, Role, User } from '../types/auth'
import { ROLE_HOME } from '../config/navigation'

export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string) { super(message) }
}
export async function api(path: string, body?: unknown) {
  const response = await fetch(`/api${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    credentials: 'include', cache: 'no-store',
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) throw new ApiError(data?.error?.mensaje || data?.mensaje || 'No se pudo completar la solicitud.', response.status, data?.error?.codigo)
  if (!data) throw new Error('La API no devolvió una respuesta válida.')
  return data
}
function mapUser(usuario: { nombre: string; correo: string; roles: string[] }): User {
  const roles = (['admin', 'monitor', 'estudiante'] as Role[]).filter(r => usuario.roles.includes(r))
  const previous = getSession()
  const preferred = previous?.email === usuario.correo ? previous.role : undefined
  const role = preferred && roles.includes(preferred) ? preferred : roles[0]
  if (!role) throw new Error('La cuenta no tiene un rol compatible.')
  return { name: usuario.nombre, email: usuario.correo, role, roles }
}
export async function login(email: string, password: string): Promise<User> {
  const data = await api('/auth/login', { correo: email.trim().toLowerCase(), contrasena: password })
  return mapUser(data.usuario)
}
export async function register(data: RegisterData) {
  return api('/auth/registro', { nombre: data.name.trim(), correo: data.email.trim().toLowerCase(), password: data.password, rol: data.role })
}
export const requestVerification = (correo: string) => api('/verificacion/solicitar', { correo: correo.trim().toLowerCase() })
export const confirmVerification = (correo: string, codigo: string) => api('/verificacion/confirmar', { correo: correo.trim().toLowerCase(), codigo: codigo.trim() })
export const sendRecoveryLink = (correo: string) => api('/auth/recuperar-contrasena', { correo: correo.trim().toLowerCase() })
export const resetPassword = (correo: string, codigo: string, nuevaContrasena: string, confirmacionContrasena: string) => api('/auth/restablecer-contrasena', { correo: correo.trim().toLowerCase(), codigo: codigo.trim(), nuevaContrasena, confirmacionContrasena })
function clearSession() { localStorage.removeItem('usuario'); sessionStorage.removeItem('usuario') }
export function saveSession(user: User, remember: boolean) {
  clearSession()
  ;(remember ? localStorage : sessionStorage).setItem('usuario', JSON.stringify(user))
}
export function getSession(): User | null {
  try {
    const raw = sessionStorage.getItem('usuario') ?? localStorage.getItem('usuario')
    return raw ? JSON.parse(raw) as User : null
  } catch { clearSession(); return null }
}
export async function fetchSession(): Promise<User | null> {
  try {
    const data = await api('/auth/perfil')
    const user = mapUser(data.usuario)
    saveSession(user, localStorage.getItem('usuario') !== null)
    return user
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) { clearSession(); return null }
    throw error
  }
}
export async function switchProfile(role: 'estudiante' | 'monitor') {
  const user = await fetchSession()
  if (!user?.roles?.includes('estudiante') || !user.roles.includes('monitor')) throw new Error('El cambio de perfil requiere ambos registros.')
  saveSession({ ...user, role }, localStorage.getItem('usuario') !== null)
  redirectByRole(role)
}
export function redirectByRole(role: User['role']) { window.location.href = ROLE_HOME[role] }
export async function logout() {
  try { await api('/auth/logout', {}) ; clearSession() }
  catch { window.alert('No se pudo cerrar la sesión en el servidor. Inténtalo de nuevo.') }
}
