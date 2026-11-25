export interface AppNotification {
  id: number | string
  type: 'request' | 'success' | 'warning'
  title: string
  text: string
  time: string
  href?: string
  read?: boolean
  details?: string
}