import { Loader2, ListTodo } from 'lucide-react'
import { useLeads } from '@/hooks/useLeads'
import { money } from '@/lib/utils'

export function FollowupsPage() {
  const { data: leads = [], isLoading } = useLeads()
  const today = new Date().toISOString().slice(0, 10)
  const due = leads.filter((l) => l.nextFollowupAt && l.nextFollowupAt <= today && !['won', 'lost'].includes(l.status))

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">YOUR BUSINESS, IN FOCUS</div>
          <h1>Follow-ups</h1>
          <p>The right conversation, at the right time.</p>
        </div>
      </div>

      <section className="panel">
        <div className="panel-heading">
          <h2>Upcoming &amp; overdue <span className="small-pill">{due.length}</span></h2>
        </div>

        {isLoading
          ? <div style={{ padding: 48, display: 'flex', justifyContent: 'center' }}><Loader2 className="animate-spin" /></div>
          : due.length
            ? <div className="table-scroll">
                <table>
                  <thead>
                    <tr><th>Lead</th><th>Company</th><th>Stage</th><th>Deal value</th><th>Follow-up date</th></tr>
                  </thead>
                  <tbody>
                    {due.map((l) => (
                      <tr key={l._id}>
                        <td><strong>{l.name}</strong><small>{l.email || 'No email'}</small></td>
                        <td>{l.company || '—'}</td>
                        <td><span style={{ background: '#fcf2e9', color: '#c2956a', borderRadius: 4, padding: '2px 7px', fontSize: 10, textTransform: 'capitalize' }}>{l.status}</span></td>
                        <td>{money(l.estimatedValue)}</td>
                        <td style={{ color: '#c2956a', fontWeight: 550 }}>{l.nextFollowupAt}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            : <div style={{ padding: '64px 24px', textAlign: 'center', color: '#9991a4' }}>
                <ListTodo size={32} style={{ margin: '0 auto 12px', opacity: .4 }} />
                <p style={{ fontSize: 13 }}>Nothing overdue. You&apos;re in a good place.</p>
              </div>
        }
      </section>
    </>
  )
}
