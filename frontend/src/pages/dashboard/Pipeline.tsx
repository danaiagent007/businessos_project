import { useQuery } from '@tanstack/react-query'
import { useApiClient } from '@/lib/api'
import { Loader2 } from 'lucide-react'
import { money } from '@/lib/utils'
import { useOrganization } from '@clerk/clerk-react'

interface Lead {
  _id: string
  name: string
  company: string
  estimatedValue: number
  status: 'new' | 'contacted' | 'qualified' | 'won' | 'lost'
  score?: number
  source: string
}

const STAGES: { key: Lead['status']; label: string; color: string; bg: string }[] = [
  { key: 'new',       label: '🌱 New',        color: '#6366f1', bg: '#eef2ff' },
  { key: 'contacted', label: '📞 Contacted',   color: '#0891b2', bg: '#ecfeff' },
  { key: 'qualified', label: '⭐ Qualified',   color: '#d97706', bg: '#fef3c7' },
  { key: 'won',       label: '🏆 Won',         color: '#16a34a', bg: '#dcfce7' },
  { key: 'lost',      label: '❌ Lost',        color: '#dc2626', bg: '#fee2e2' },
]

function KanbanCard({ lead }: { lead: Lead }) {
  return (
    <div
      style={{ background: 'white', borderRadius: 8, padding: '12px 14px', boxShadow: '0 1px 3px rgba(0,0,0,.08)', marginBottom: 10, borderLeft: '3px solid #7450d7', cursor: 'default' }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 12px rgba(116,80,215,.15)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,.08)')}
    >
      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{lead.name}</div>
      {lead.company && <div style={{ fontSize: 11, color: '#888', marginBottom: 6 }}>{lead.company}</div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#333' }}>{money(lead.estimatedValue)}</span>
        {(lead.score ?? 0) > 0 && (
          <span style={{
            fontSize: 10, fontWeight: 700, borderRadius: 99, padding: '2px 7px',
            background: (lead.score ?? 0) >= 70 ? '#dcfce7' : (lead.score ?? 0) >= 40 ? '#fef3c7' : '#fee2e2',
            color:      (lead.score ?? 0) >= 70 ? '#16a34a' : (lead.score ?? 0) >= 40 ? '#d97706' : '#dc2626',
          }}>✦ {lead.score}</span>
        )}
      </div>
    </div>
  )
}

export function PipelinePage() {
  const api = useApiClient()
  const { organization } = useOrganization()

  const { data: leads = [], isLoading } = useQuery<Lead[]>({
    queryKey: ['leads'],
    queryFn: () => api.leads.list().then(r => (r as { leads: Lead[] }).leads),
    enabled: !!organization,
    refetchInterval: 15_000,
  })

  const grouped = STAGES.reduce<Record<string, Lead[]>>((acc, s) => {
    acc[s.key] = leads.filter(l => l.status === s.key)
    return acc
  }, {} as Record<string, Lead[]>)

  const totalValue = leads.filter(l => l.status !== 'lost').reduce((s, l) => s + (l.estimatedValue || 0), 0)

  if (isLoading) return (
    <div style={{ padding: 80, display: 'flex', justifyContent: 'center' }}><Loader2 className="animate-spin" size={28} /></div>
  )

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">YOUR BUSINESS, IN FOCUS</div>
          <h1>Pipeline</h1>
          <p>Track every deal from first contact to close.</p>
        </div>
        <div style={{ fontSize: 13, color: '#666', alignSelf: 'center' }}>
          Open pipeline: <strong style={{ color: '#7450d7' }}>{money(totalValue)}</strong>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${STAGES.length}, minmax(180px, 1fr))`, gap: 14, overflowX: 'auto', paddingBottom: 16 }}>
        {STAGES.map(stage => (
          <div key={stage.key} style={{ minWidth: 180 }}>
            <div style={{ background: stage.bg, borderRadius: 8, padding: '10px 14px', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: stage.color }}>{stage.label}</span>
              <span style={{ background: stage.color, color: 'white', borderRadius: 99, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>{grouped[stage.key].length}</span>
            </div>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 8, paddingLeft: 2 }}>
              {money(grouped[stage.key].reduce((s, l) => s + (l.estimatedValue || 0), 0))}
            </div>
            <div>
              {grouped[stage.key].length === 0
                ? <div style={{ padding: '18px 10px', textAlign: 'center', fontSize: 12, color: '#bbb', background: '#f9f9fb', borderRadius: 8, border: '2px dashed #e8e6ef' }}>No leads</div>
                : grouped[stage.key].map(lead => <KanbanCard key={lead._id} lead={lead} />)
              }
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
