import { useLocation, useNavigate } from 'react-router'
import { Bell, Menu, Search } from 'lucide-react'
import { useUser } from '@clerk/clerk-react'
import { useUIStore } from '@/stores/ui'
import { useLeads } from '@/hooks/useLeads'

const pathLabel: Record<string, string> = {
  '/overview': 'Overview',
  '/leads': 'Leads & CRM',
  '/followups': 'Follow-ups',
  '/inbox': 'Inbox',
  '/documents': 'Documents',
  '/automations': 'Automations',
  '/analytics': 'Analytics',
  '/integrations': 'Integrations',
  '/settings': 'Settings',
}

export function Topbar() {
  const { user } = useUser()
  const location = useLocation()
  const navigate = useNavigate()
  const { toggleMobileNav, setNotice } = useUIStore()
  const { data: leads = [] } = useLeads()
  const due = leads.filter(
    (l) => l.nextFollowupAt && l.nextFollowupAt <= new Date().toISOString().slice(0, 10),
  )
  const view = pathLabel[location.pathname] || 'Dashboard'

  return (
    <header className="topbar">
      <div className="flex items-center gap-3">
        <button onClick={toggleMobileNav} className="lg:hidden" aria-label="Open navigation">
          <Menu size={20} />
        </button>
        <span className="topbar-home">Workspace</span>
        <span className="text-muted-foreground">/</span>
        <span>{view}</span>
      </div>

      <div className="flex items-center gap-5">
        <button
          className="top-search"
          onClick={() => { navigate('/leads'); setTimeout(() => document.getElementById('lead-search')?.focus(), 0) }}
        >
          <Search size={16} /><span>Search anything...</span><kbd>⌘ K</kbd>
        </button>
        <span className="top-divider" />
        <button
          aria-label="Notifications"
          className="notification-button"
          onClick={() => setNotice(due.length
            ? `You have ${due.length} follow-ups due. Open Follow-ups to review them.`
            : 'You are all caught up!'
          )}
        >
          <Bell size={19} />
        </button>
        <span className="top-avatar">{user?.firstName?.slice(0, 1) || 'B'}</span>
      </div>
    </header>
  )
}
