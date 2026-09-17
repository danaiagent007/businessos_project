import { useState } from 'react'
import { Loader2, Plus, Search, Users, Sparkles, MessageSquare, Mail, Copy, Check, X } from 'lucide-react'
import { useLeads } from '@/hooks/useLeads'
import { LeadEditor } from '@/components/leads/LeadEditor'
import { useApiClient } from '@/lib/api'
import type { Lead } from '@business-os/shared'
import { money } from '@/lib/utils'
import { useOrganization } from '@clerk/clerk-react'

const stages = ['all', 'new', 'contacted', 'qualified', 'won', 'lost']

/** AI Score badge */
function ScoreBadge({ score }: { score?: number }) {
  if (score == null || score === 0)
    return <span style={{ fontSize: 10, color: '#bbb', display: 'flex', alignItems: 'center', gap: 3 }}><Sparkles size={10} style={{ opacity: 0.4 }} /> Scoring…</span>
  const color = score >= 70 ? '#16a34a' : score >= 40 ? '#d97706' : '#dc2626'
  const bg    = score >= 70 ? '#dcfce7' : score >= 40 ? '#fef3c7' : '#fee2e2'
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: bg, color, borderRadius: 99, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>
      <Sparkles size={9} /> {score}
    </span>
  )
}

/** AI Follow-up Modal */
function FollowupModal({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const api = useApiClient()
  const [style, setStyle]       = useState<'whatsapp' | 'email'>('whatsapp')
  const [message, setMessage]   = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [copied, setCopied]     = useState(false)
  const [generated, setGenerated] = useState(false)

  async function generate(s: 'whatsapp' | 'email') {
    setStyle(s)
    setLoading(true)
    setError('')
    setCopied(false)
    try {
      const res = await api.leads.generateFollowup(lead._id, s)
      setMessage(res.message)
      setGenerated(true)
    } catch (e) {
      setError((e as Error).message || 'AI failed. Try again.')
    } finally {
      setLoading(false)
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(message)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999,
      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{
        background: 'white', borderRadius: 16, width: '100%', maxWidth: 520,
        boxShadow: '0 24px 80px rgba(0,0,0,0.22)', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #f0eff5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ background: 'linear-gradient(135deg,#7450d7,#9b6bff)', borderRadius: 8, padding: 6, display: 'flex' }}>
                <Sparkles size={14} color="white" />
              </div>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1a1625', margin: 0 }}>Draft Follow-up</h2>
            </div>
            <p style={{ fontSize: 11, color: '#9991a4', margin: '4px 0 0 38px' }}>
              For <strong style={{ color: '#4b3f72' }}>{lead.name}</strong>
              {lead.company ? ` · ${lead.company}` : ''}
            </p>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: '#f5f4fb', borderRadius: 8, padding: 6, cursor: 'pointer', display: 'flex', color: '#9991a4' }}>
            <X size={16} />
          </button>
        </div>

        {/* Style picker */}
        <div style={{ padding: '16px 24px 12px', display: 'flex', gap: 10 }}>
          <button
            id="followup-whatsapp-btn"
            onClick={() => generate('whatsapp')}
            disabled={loading}
            style={{
              flex: 1, padding: '10px 14px', borderRadius: 10, border: '1.5px solid',
              borderColor: style === 'whatsapp' && generated ? '#7450d7' : '#e8e6f0',
              background: style === 'whatsapp' && generated ? '#f5f0ff' : 'white',
              color: style === 'whatsapp' && generated ? '#7450d7' : '#6b7280',
              fontWeight: 600, fontSize: 12, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            }}
          >
            <MessageSquare size={14} /> WhatsApp
          </button>
          <button
            id="followup-email-btn"
            onClick={() => generate('email')}
            disabled={loading}
            style={{
              flex: 1, padding: '10px 14px', borderRadius: 10, border: '1.5px solid',
              borderColor: style === 'email' && generated ? '#7450d7' : '#e8e6f0',
              background: style === 'email' && generated ? '#f5f0ff' : 'white',
              color: style === 'email' && generated ? '#7450d7' : '#6b7280',
              fontWeight: 600, fontSize: 12, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            }}
          >
            <Mail size={14} /> Email
          </button>
        </div>

        {/* Content area */}
        <div style={{ padding: '0 24px 24px', minHeight: 180 }}>
          {!generated && !loading && !error && (
            <div style={{ padding: '40px 0', textAlign: 'center', color: '#bbb' }}>
              <Sparkles size={28} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
              <p style={{ fontSize: 12, margin: 0 }}>Choose WhatsApp or Email above to generate your draft</p>
            </div>
          )}

          {loading && (
            <div style={{ padding: '48px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, color: '#9991a4' }}>
              <Loader2 size={22} className="animate-spin" style={{ color: '#7450d7' }} />
              <p style={{ fontSize: 12, margin: 0 }}>AI is crafting your message…</p>
            </div>
          )}

          {error && (
            <div style={{ padding: 14, background: '#fef2f2', borderRadius: 10, color: '#dc2626', fontSize: 12, marginTop: 4 }}>
              {error}
            </div>
          )}

          {generated && !loading && message && (
            <>
              <textarea
                id="followup-message-textarea"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={style === 'email' ? 9 : 5}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  border: '1.5px solid #e8e6f0', borderRadius: 10, padding: '12px 14px',
                  fontSize: 13, lineHeight: 1.6, color: '#2d2440', resize: 'vertical',
                  fontFamily: style === 'email' ? 'inherit' : 'inherit',
                  background: '#faf9ff', outline: 'none',
                }}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button
                  id="copy-followup-btn"
                  onClick={copy}
                  style={{
                    flex: 1, padding: '10px 0', borderRadius: 10,
                    background: copied ? '#16a34a' : '#7450d7',
                    color: 'white', border: 'none', fontWeight: 600, fontSize: 12,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    transition: 'background 0.2s',
                  }}
                >
                  {copied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy to Clipboard</>}
                </button>
                <button
                  onClick={() => generate(style)}
                  style={{
                    padding: '10px 16px', borderRadius: 10, border: '1.5px solid #e8e6f0',
                    background: 'white', color: '#7450d7', fontWeight: 600, fontSize: 12, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  <Sparkles size={13} /> Regenerate
                </button>
              </div>
              <p style={{ fontSize: 10, color: '#bbb', marginTop: 8, textAlign: 'center' }}>
                You can edit the message above before copying
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export function LeadsPage() {
  const { organization }             = useOrganization()
  const { data: leads = [], isLoading, error, refetch } = useLeads()
  const [search, setSearch]          = useState('')
  const [stage, setStage]            = useState('all')
  const [editorOpen, setEditorOpen]  = useState(false)
  const [selected, setSelected]      = useState<Lead | undefined>()
  const [followupLead, setFollowupLead] = useState<Lead | undefined>()

  const filtered = leads.filter(
    (l) =>
      (stage === 'all' || l.status === stage) &&
      `${l.name} ${l.email} ${l.company}`.toLowerCase().includes(search.toLowerCase()),
  )

  const add  = () => { setSelected(undefined); setEditorOpen(true) }
  const edit = (l: Lead) => { setSelected(l); setEditorOpen(true) }

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">YOUR BUSINESS, IN FOCUS</div>
          <h1>Leads &amp; CRM</h1>
          <p>Every relationship. Every opportunity. One place.</p>
        </div>
        <div className="heading-actions">
          <button
            id="add-lead-btn"
            onClick={add}
            disabled={!organization}
            title={!organization ? 'Select an organization first' : undefined}
            style={{ fontSize: 11, height: 34, padding: '0 13px', borderRadius: 6, background: '#7450d7', color: 'white', fontWeight: 550 }}
          >
            <Plus size={14} style={{ display: 'inline', marginRight: 4 }} />Add lead
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="error-banner">
          {(error as Error).message}
          <button onClick={() => refetch()}>Try again</button>
        </div>
      )}

      <section className="panel">
        <div className="panel-heading">
          <h2>All leads <span className="small-pill">{leads.length}</span></h2>
          <select
            id="stage-filter"
            className="compact-select"
            aria-label="Filter by stage"
            value={stage}
            onChange={(e) => setStage(e.target.value)}
          >
            {stages.map((s) => <option key={s} value={s}>{s === 'all' ? 'All Stages' : s}</option>)}
          </select>
        </div>
        <div className="search-field">
          <Search size={16} />
          <input
            id="lead-search"
            aria-label="Search leads"
            placeholder="Search by name, company, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {isLoading
          ? <div style={{ padding: 48, display: 'flex', justifyContent: 'center' }}><Loader2 className="animate-spin" /></div>
          : filtered.length
            ? <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Lead</th>
                      <th>Company</th>
                      <th>Stage</th>
                      <th>AI Score</th>
                      <th>Deal value</th>
                      <th>Follow-up</th>
                      <th><span className="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((l) => (
                      <tr key={l._id}>
                        <td><strong>{l.name}</strong><small>{l.email || 'No email'}</small></td>
                        <td>{l.company || '—'}</td>
                        <td>
                          <span style={{ background: '#f0f0f4', borderRadius: 4, padding: '2px 7px', fontSize: 10, textTransform: 'capitalize' }}>
                            {l.status}
                          </span>
                        </td>
                        <td><ScoreBadge score={l.score} /></td>
                        <td>{money(l.estimatedValue)}</td>
                        <td>{l.nextFollowupAt || 'Not scheduled'}</td>
                        <td style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <button
                            id={`followup-${l._id}`}
                            title="Draft AI follow-up message"
                            onClick={() => setFollowupLead(l)}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              background: 'linear-gradient(135deg,#7450d7,#9b6bff)',
                              color: 'white', border: 'none', borderRadius: 6,
                              padding: '4px 9px', fontSize: 10, fontWeight: 600, cursor: 'pointer',
                            }}
                          >
                            <Sparkles size={10} /> Draft
                          </button>
                          <button
                            id={`edit-lead-${l._id}`}
                            style={{ color: '#7450d7', fontSize: 11 }}
                            onClick={() => edit(l)}
                          >
                            Edit<span className="sr-only"> {l.name}</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            : <div style={{ padding: '64px 24px', textAlign: 'center', color: '#9991a4' }}>
                <Users size={32} style={{ margin: '0 auto 12px', opacity: .4 }} />
                <p style={{ fontSize: 13 }}>{search ? 'No matching leads' : 'Your next chapter starts with a lead'}</p>
                {!search && <button onClick={add} style={{ marginTop: 16, fontSize: 11, padding: '8px 14px', borderRadius: 6, background: '#7450d7', color: 'white', fontWeight: 550 }}>Add your first lead</button>}
              </div>
        }
      </section>

      {editorOpen && (
        <LeadEditor
          key={selected?._id || 'new'}
          lead={selected}
          onClose={() => setEditorOpen(false)}
          onSaved={() => { refetch(); setEditorOpen(false) }}
        />
      )}

      {followupLead && (
        <FollowupModal
          lead={followupLead}
          onClose={() => setFollowupLead(undefined)}
        />
      )}
    </>
  )
}
