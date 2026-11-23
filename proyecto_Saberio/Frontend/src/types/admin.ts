export interface SupportDoc {
  id: string
  monitor: string
  email: string
  subject: string
  kind: string
  date: string
  status: string
  fileName: string
  fileSize?: number
  downloadUrl: string
}

export interface ActivityItem {
  id: string | number
  text: string
  time: string
}

export interface AdminSession {
  id: string | number
  student: string
  monitor: string
  subject: string
  date: string
  status: string
  rating?: number | null
}

export interface PlatformUser {
  id: string | number
  name: string
  email: string
  role: string
  career: string
  date: string
}

export interface Subject {
  id: string | number
  code: string
  name: string
  faculty: string
  credits: number
  active: boolean
}
