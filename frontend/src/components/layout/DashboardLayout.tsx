import { Outlet } from 'react-router'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { useUIStore } from '@/stores/ui'
import { NoticeDialog } from '@/components/ui/NoticeDialog'

export function DashboardLayout() {
  const { mobileNavOpen, setMobileNavOpen } = useUIStore()

  return (
    <div className="workspace-shell light">
      {mobileNavOpen && (
        <button
          aria-label="Close navigation"
          className="mobile-backdrop"
          onClick={() => setMobileNavOpen(false)}
        />
      )}
      <Sidebar />
      <div className="main-shell">
        <Topbar />
        <main className="main-content">
          <Outlet />
        </main>
      </div>
      <NoticeDialog />
    </div>
  )
}
