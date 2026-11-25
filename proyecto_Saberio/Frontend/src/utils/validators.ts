import { api } from '../services/authService'
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
let dominios: Set<string> | null = null
let carga: Promise<void> | null = null
export function cargarDominiosInstitucionales(): Promise<void> {
  if (dominios) return Promise.resolve()
  if (!carga) carga = api('/auth/dominios-institucionales').then(data => {
    if (!Array.isArray(data.dominios) || !data.dominios.length || !data.dominios.every((d: unknown) => typeof d === 'string' && d.trim().length > 0)) throw new Error('El catálogo institucional no está disponible.')
    dominios = new Set<string>(data.dominios.map((d: string) => d.trim().toLowerCase()))
  }).catch(error => { carga = null; throw error })
  return carga
}
export function isInstitutionalEmail(email: string): boolean {
  const value = email.trim().toLowerCase()
  if (!dominios || value.length > 254 || !EMAIL_REGEX.test(value)) return false
  const [local, domain] = value.split('@')
  return local.length <= 64 && !local.startsWith('.') && !local.endsWith('.') && !local.includes('..') && dominios.has(domain)
}
export function isStrongPassword(password: string): boolean {
  return password.length >= 8 && /[A-Z]/.test(password) && /\d/.test(password)
}
