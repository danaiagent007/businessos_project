import { useNavigate } from 'react-router'
import { useUser, useOrganization } from '@clerk/clerk-react'
import { ArrowRight, ArrowUpRight, ArrowDownLeft, Blocks, ChartNoAxesCombined, CheckCheck, Clock3, Flame, ShieldCheck, Sparkles, Target, Users, Wallet } from 'lucide-react'
import { useLeads } from '@/hooks/useLeads'
import { money } from '@/lib/utils'

function ActionCard({ icon: Icon, tone, eyebrow, title, description, action, onClick }: {
  icon: typeof Flame; tone: string; eyebrow: string; title: string; description: string; action: string; onClick: () => void
}) {
  return (
    <article className="action-card">
      <div className="flex items-center justify-between">
        <span className={`action-icon ${tone}`}><Icon size={19} /></span>
        <span className="action-eyebrow">{eyebrow}</span>
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      <button onClick={onClick}>{action}<ArrowRight size={15} /></button>
    </article>
  )
}

export function Overview() {
  const navigate = useNavigate()
  const { user } = useUser()
  const { organization } = useOrganization()
  const { data: leads = [], isLoading } = useLeads()

  const won = leads.filter((l) => l.status === 'won')
  const active = leads.filter((l) => !['won', 'lost'].includes(l.status))
  const due = active.filter(
    (l) => l.nextFollowupAt && l.nextFollowupAt <= new Date().toISOString().slice(0, 10),
  )
  const qualified = active.filter((l) => l.status === 'qualified')

  const stats = [
    { name: 'Total leads', value: leads.length, icon: Users, note: 'Relationships in your workspace', tone: 'purple' },
    { name: 'Pipeline value', value: money(active.reduce((s, l) => s + l.estimatedValue, 0)), icon: Wallet, note: 'Across all open opportunities', tone: 'blue' },
    { name: 'Won revenue', value: money(won.reduce((s, l) => s + l.estimatedValue, 0)), icon: Target, note: `${won.length} successfully closed deals`, tone: 'green' },
    { name: 'Follow-ups due', value: due.length, icon: Clock3, note: due.length ? 'A little nudge goes a long way' : 'Nothing overdue.', tone: 'orange' },
  ]

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">YOUR BUSINESS, IN FOCUS</div>
          <h1>A good day to grow{user?.firstName ? `, ${user.firstName}` : ''}.</h1>
          <p>Less juggling. More moving forward. Here's your business at a glance.</p>
        </div>
        <div className="heading-actions">
          <span className="date-label">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          <button style={{ fontSize: 11, height: 34, padding: '0 13px', borderRadius: 6, background: '#7450d7', color: 'white', fontWeight: 550 }} onClick={() => navigate('/leads')}>
            + Add lead
          </button>
        </div>
      </div>

      {/* Daily brief */}
      <section className="briefing">
        <div className="briefing-content">
          <div className="briefing-label">
            <Sparkles size={16} /> YOUR DAILY BRIEF<span>WORKSPACE INSIGHTS</span>
          </div>
          <h2>Big picture. Clear next steps.</h2>
          <p>
            {leads.length
              ? `${active.length} open opportunities. ${due.length} follow-ups ready for your attention.`
              : 'Your next opportunity starts with a conversation. Bring your leads together.'}
          </p>
          <button onClick={() => navigate('/followups')}>Let&apos;s make progress <ArrowRight size={16} /></button>
        </div>
        <div className="briefing-art" aria-hidden="true">
          <div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="orbit orbit-three" />
          <div className="art-tile art-tile-one"><CheckCheck size={19} /></div>
          <div className="art-center"><Sparkles size={37} strokeWidth={1.4} /></div>
          <div className="art-tile art-tile-two"><ChartNoAxesCombined size={22} /></div>
          <span className="art-dot dot-one" /><span className="art-dot dot-two" />
        </div>
      </section>

      {/* Stats */}
      <section className="stats-grid" aria-label="Business metrics">
        {stats.map(({ name, value, icon: Icon, note, tone }) => (
          <article className="stat-card" key={name}>
            <div className="stat-top"><span>{name}</span><span className={`metric-icon ${tone}`}><Icon size={16} /></span></div>
            <strong>{isLoading ? '…' : value}</strong>
            <p>{note}</p>
          </article>
        ))}
      </section>

      {/* Action cards */}
      <div className="section-heading">
        <h2>Make your next move <span className="small-pill">Today</span></h2>
        <span>A little focus goes a long way</span>
      </div>
      <section className="action-grid">
        <ActionCard icon={Flame} tone="orange" eyebrow="PRIORITIZE" title={qualified.length ? `${qualified.length} leads are ready for more` : 'Find your next big opportunity'} description="Keep your most promising relationships moving toward a yes." action="Explore your leads" onClick={() => navigate('/leads')} />
        <ActionCard icon={Clock3} tone="purple" eyebrow="FOLLOW THROUGH" title={due.length ? `${due.length} conversations to pick up` : 'Never miss a moment to connect'} description="A thoughtful follow-up can turn a maybe into your next milestone." action="View follow-ups" onClick={() => navigate('/followups')} />
        <ActionCard icon={Blocks} tone="green" eyebrow="BRING IT TOGETHER" title="Your tools. Better together." description="Make space for a simpler day with all your business essentials in one place." action="Explore integrations" onClick={() => navigate('/integrations')} />
      </section>

      {/* Pipeline + Activity */}
      <div className="bottom-grid">
        <section className="panel">
          <div className="panel-heading">
            <h2>Your pipeline</h2>
            <button onClick={() => navigate('/leads')}>View CRM <ArrowUpRight size={14} /></button>
          </div>
          <p className="panel-subtitle">Small steps. Real momentum.</p>
          <div className="pipeline-stages">
            {['new', 'contacted', 'qualified', 'won'].map((s, i) => (
              <div key={s}>
                <div className={`stage-line stage-${i}`} />
                <span>{s}</span>
                <strong>{leads.filter((l) => l.status === s).length}</strong>
                <small>{money(leads.filter((l) => l.status === s).reduce((sum, l) => sum + l.estimatedValue, 0))}</small>
              </div>
            ))}
          </div>
          <div className="panel-foot"><ShieldCheck size={14} />Your workspace data. Always up to date.</div>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <h2>Recent activity</h2>
            <span className="live-label"><span />Live workspace</span>
          </div>
          {leads.length
            ? <div className="activity-list">
                {leads.slice(0, 3).map((l) => (
                  <button key={l._id} onClick={() => navigate('/leads')}>
                    <span className="activity-icon"><ArrowDownLeft size={16} /></span>
                    <div><strong>{l.name}</strong><small>Added to your pipeline · {l.status}</small></div>
                    <ArrowUpRight size={14} />
                  </button>
                ))}
              </div>
            : <div style={{ padding: '24px 21px', color: '#9991a4', fontSize: 11 }}>No leads yet. Add your first lead to get started.</div>
          }
        </section>
      </div>

      <footer className="dashboard-footer">
        <span><span className="status-dot" /> Built for a little more peace of mind.</span>
        <span>One workspace. Endless possibilities.</span>
      </footer>
    </>
  )
}
