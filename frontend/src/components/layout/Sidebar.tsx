import { Link, useLocation, useNavigate } from 'react-router'
import {
  Blocks, ChartNoAxesCombined, CircleHelp, FileText, LayoutDashboard,
  ListTodo, MessageSquare, Settings2, Sparkles, Users, Users2, Workflow,
  ArrowUpRight, ArrowRight, ChevronDown, GitBranch, Brain,
} from 'lucide-react'
import {
  useAuth, useUser,
  SignInButton, UserButton, OrganizationSwitcher,
} from '@clerk/clerk-react'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/stores/ui'
import { useLeads } from '@/hooks/useLeads'

const navigation = [
  { name: 'Overview',   path: '/overview',  icon: LayoutDashboard },
  { name: 'Leads & CRM', path: '/leads',   icon: Users },
  { name: 'Customers',  path: '/customers', icon: Users2 },
  { name: 'Pipeline',   path: '/pipeline',  icon: GitBranch },
  { name: 'Follow-ups', path: '/followups', icon: ListTodo },
  { name: 'Inbox',      path: '/inbox',     icon: MessageSquare },
  { name: 'Documents',  path: '/documents', icon: FileText },
  { name: 'Automations', path: '/automations', icon: Workflow },
  { name: 'Analytics',  path: '/analytics', icon: ChartNoAxesCombined },
]

export function Sidebar() {
  const { isSignedIn } = useAuth()
  const { user } = useUser()
  const location = useLocation()
  const navigate = useNavigate()
  const { mobileNavOpen, setMobileNavOpen, setNotice } = useUIStore()
  const { data: leads = [] } = useLeads()

  const due = leads.filter(
    (l) => l.nextFollowupAt && l.nextFollowupAt <= new Date().toISOString().slice(0, 10),
  )

  const close = () => setMobileNavOpen(false)

  return (
    <aside className={cn('sidebar', mobileNavOpen && 'sidebar-open')}>
      <Link to="/" className="brand" onClick={close}>
        <span className="brand-icon"><Blocks size={21} /></span>
        business<span className="brand-os">os</span><span className="brand-dot" />
      </Link>

      <div className="workspace-switch">
        <span className="workspace-avatar">B</span>
        <div className="min-w-0 flex-1">
          {isSignedIn
            ? <OrganizationSwitcher hidePersonal afterSelectOrganizationUrl="/" afterCreateOrganizationUrl="/" />
            : <><strong>Your workspace</strong><small>Let&apos;s build something great</small></>
          }
        </div>
        {!isSignedIn && <ChevronDown size={14} />}
      </div>

      <div className="nav-heading">WORKSPACE</div>
      <nav aria-label="Main navigation">
        {navigation.map(({ name, path, icon: Icon }) => (
          <Link
            key={name}
            to={path}
            onClick={close}
            className={cn('nav-item', location.pathname === path && 'nav-active')}
            aria-current={location.pathname === path ? 'page' : undefined}
          >
            <Icon size={18} />
            <span>{name}</span>
            {name === 'Follow-ups' && due.length > 0 && (
              <span className="nav-count">{due.length}</span>
            )}
            {name === 'Automations' && <Sparkles size={13} className="ml-auto" />}
          </Link>
        ))}
      </nav>

      <div className="nav-heading mt-7">MANAGE</div>
      <Link
        to="/knowledge"
        className={cn('nav-item', location.pathname === '/knowledge' && 'nav-active')}
        onClick={close}
      >
        <Brain size={18} />Knowledge Base
        <span style={{ marginLeft: 'auto', fontSize: 9, background: 'linear-gradient(135deg,#7450d7,#9b6bff)', color: 'white', borderRadius: 99, padding: '2px 6px', fontWeight: 700 }}>AI</span>
      </Link>
      <Link
        to="/integrations"
        className={cn('nav-item', location.pathname === '/integrations' && 'nav-active')}
        onClick={close}
      >
        <Blocks size={18} />Integrations
      </Link>
      <Link
        to="/settings"
        className={cn('nav-item', location.pathname === '/settings' && 'nav-active')}
        onClick={close}
      >
        <Settings2 size={18} />Settings
      </Link>

      <div className="sidebar-bottom">
        <div className="side-note">
          <span className="flex items-center gap-2 font-medium">
            <Sparkles size={16} /> A little less busywork.
          </span>
          <p>A lot more room to grow.<br />Your next chapter starts here.</p>
          <button onClick={() => { navigate('/overview'); close() }}>
            Explore your workspace <ArrowUpRight size={14} />
          </button>
        </div>

        <button
          className="nav-item"
          onClick={() => setNotice('Getting started: create an organization, add your leads, and set a follow-up date. Use the CRM to move opportunities from new to won.')}
        >
          <CircleHelp size={18} />Help & getting started<ArrowUpRight size={14} className="ml-auto" />
        </button>

        <div className="profile">
          {isSignedIn
            ? <>
                <UserButton />
                <div>
                  <strong>{user?.fullName || 'Your account'}</strong>
                  <small>Manage your account</small>
                </div>
              </>
            : <>
                <span className="profile-icon"><Users size={17} /></span>
                <SignInButton mode="modal">
                  <button className="text-left">
                    <strong>Sign in to your workspace</strong>
                    <small>Secure access with Clerk <ArrowRight size={11} /></small>
                  </button>
                </SignInButton>
              </>
          }
        </div>
      </div>
    </aside>
  )
}
