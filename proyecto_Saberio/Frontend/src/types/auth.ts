export type Role = 'estudiante' | 'monitor' | 'admin'
export type SignUpRole = Exclude<Role, 'admin'>
export interface User {
  name: string
  email: string
  role: Role
  roles?: Role[]
}
export interface RegisterData {
  name: string
  email: string
  password: string
  role: SignUpRole
}
