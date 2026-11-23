import type { ReactNode } from 'react'
import DashboardLayout from '../../layout/DashboardLayout/DashboardLayout'

interface AdminLayoutProps {
  children: ReactNode
}

function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <DashboardLayout role="admin" notifications={[]}>
      {children}
    </DashboardLayout>
  )
}

export default AdminLayout
