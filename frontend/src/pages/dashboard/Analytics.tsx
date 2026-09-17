import { useQuery } from '@tanstack/react-query'
import { useApiClient } from '@/lib/api'
import { useOrganization } from '@clerk/clerk-react'
import { Loader2 } from 'lucide-react'
import { money } from '@/lib/utils'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

const STAGE_COLORS: Record<string, string> = {
  new: '#6366f1', contacted: '#0891b2', qualified: '#d97706', won: '#16a34a', lost: '#dc2626',
}

interface PipelineItem { _id: string; count: number; totalValue: number }
interface Lead { _id: string; estimatedValue: number; status: string; score?: number; source: string; createdAt: string }
interface Customer { totalSpend: number; status: string }

function StatCard({ label, value, sub, color = '#7450d7' }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div style={{ background: 'white', borderRadius: 10, padding: '18px 22px', boxShadow: '0 1px 3px rgba(0,0,0,.07)' }}>
      <div style={{ fontSize: 24, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#333', marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

export function AnalyticsPage() {
  const api = useApiClient()
  const { organization } = useOrganization()

  const { data: pipeline = [], isLoading: loadingPipeline } = useQuery<PipelineItem[]>({
    queryKey: ['pipeline'],
    queryFn: () => api.leads.pipeline().then(r => (r as { summary: PipelineItem[] }).summary),
    enabled: !!organization,
  })

  const { data: leads = [], isLoading: loadingLeads } = useQuery<Lead[]>({
    queryKey: ['leads'],
    queryFn: () => api.leads.list().then(r => (r as { leads: Lead[] }).leads),
    enabled: !!organization,
  })

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: () => api.customers.list().then(r => (r as { customers: Customer[] }).customers),
    enabled: !!organization,
  })

  const isLoading = loadingPipeline || loadingLeads

  const totalLeads    = leads.length
  const wonLeads      = leads.filter(l => l.status === 'won')
  const wonRevenue    = wonLeads.reduce((s, l) => s + (l.estimatedValue || 0), 0)
  const pipelineValue = leads.filter(l => !['won','lost'].includes(l.status)).reduce((s, l) => s + (l.estimatedValue || 0), 0)
  const scoredLeads   = leads.filter(l => (l.score ?? 0) > 0)
  const avgScore      = scoredLeads.length > 0 ? Math.round(scoredLeads.reduce((s, l) => s + (l.score ?? 0), 0) / scoredLeads.length) : 0
  const winRate       = totalLeads > 0 ? Math.round((wonLeads.length / totalLeads) * 100) : 0
  const customerRevenue = customers.reduce((s, c) => s + (c.totalSpend || 0), 0)

  const pipelineChart = pipeline.map(p => ({ stage: p._id, count: p.count }))

  const scoreBuckets = [
    { label: 'Hot (70-100)', count: scoredLeads.filter(l => (l.score ?? 0) >= 70).length, fill: '#16a34a' },
    { label: 'Warm (40-69)', count: scoredLeads.filter(l => (l.score ?? 0) >= 40 && (l.score ?? 0) < 70).length, fill: '#d97706' },
    { label: 'Cold (0-39)',  count: scoredLeads.filter(l => (l.score ?? 0) > 0 && (l.score ?? 0) < 40).length, fill: '#dc2626' },
  ].filter(b => b.count > 0)

  const sourceMap = leads.reduce<Record<string, number>>((acc, l) => { acc[l.source] = (acc[l.source] || 0) + 1; return acc }, {})
  const sourceChart = Object.entries(sourceMap).map(([name, value]) => ({ name, value }))

  const now = new Date()
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    return {
      label: d.toLocaleDateString('en', { month: 'short' }),
      count: leads.filter(l => { const c = new Date(l.createdAt); return c.getFullYear() === d.getFullYear() && c.getMonth() === d.getMonth() }).length,
    }
  })

  if (isLoading) return (
    <div style={{ padding: 80, display: 'flex', justifyContent: 'center' }}><Loader2 className="animate-spin" size={28} /></div>
  )

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">YOUR BUSINESS, IN FOCUS</div>
          <h1>Analytics</h1>
          <p>Numbers that tell your business story.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        <StatCard label="Total Leads"    value={totalLeads}          sub="All time" />
        <StatCard label="Pipeline Value" value={money(pipelineValue)} sub="Open deals"          color="#0891b2" />
        <StatCard label="Won Revenue"    value={money(wonRevenue)}    sub={`${winRate}% win rate`} color="#16a34a" />
        <StatCard label="Avg AI Score"   value={avgScore || '—'}      sub="Lead quality"         color="#d97706" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <div style={{ background: 'white', borderRadius: 10, padding: '20px 22px', boxShadow: '0 1px 3px rgba(0,0,0,.07)' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700 }}>Leads by Stage</h3>
          {pipelineChart.length === 0
            ? <div style={{ padding: 40, textAlign: 'center', color: '#bbb', fontSize: 13 }}>No data yet</div>
            : <ResponsiveContainer width="100%" height={220}>
                <BarChart data={pipelineChart} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0eef8" />
                  <XAxis dataKey="stage" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => [v, 'Count']} />
                  <Bar dataKey="count" radius={[4,4,0,0]}>
                    {pipelineChart.map(d => <Cell key={d.stage} fill={STAGE_COLORS[d.stage] || '#7450d7'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
          }
        </div>

        <div style={{ background: 'white', borderRadius: 10, padding: '20px 22px', boxShadow: '0 1px 3px rgba(0,0,0,.07)' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700 }}>Leads Created (Last 6 Months)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0eef8" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#7450d7" strokeWidth={2.5} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: 'white', borderRadius: 10, padding: '20px 22px', boxShadow: '0 1px 3px rgba(0,0,0,.07)' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700 }}>AI Lead Quality Distribution</h3>
          {scoreBuckets.length === 0
            ? <div style={{ padding: 40, textAlign: 'center', color: '#bbb', fontSize: 13 }}>Add leads to see AI scoring</div>
            : <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={scoreBuckets} dataKey="count" nameKey="label" cx="50%" cy="50%" outerRadius={80}>
                    {scoreBuckets.map(b => <Cell key={b.label} fill={b.fill} />)}
                  </Pie>
                  <Tooltip />
                  <Legend iconSize={10} />
                </PieChart>
              </ResponsiveContainer>
          }
        </div>

        <div style={{ background: 'white', borderRadius: 10, padding: '20px 22px', boxShadow: '0 1px 3px rgba(0,0,0,.07)' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700 }}>Lead Sources</h3>
          {sourceChart.length === 0
            ? <div style={{ padding: 40, textAlign: 'center', color: '#bbb', fontSize: 13 }}>No source data yet</div>
            : <ResponsiveContainer width="100%" height={220}>
                <BarChart data={sourceChart} layout="vertical" barSize={18}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0eef8" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#7450d7" radius={[0,4,4,0]} />
                </BarChart>
              </ResponsiveContainer>
          }
        </div>
      </div>

      {customerRevenue > 0 && (
        <div style={{ background: 'linear-gradient(135deg,#7450d7 0%,#a855f7 100%)', borderRadius: 10, padding: '20px 24px', color: 'white' }}>
          <div style={{ fontSize: 13, opacity: .85, marginBottom: 6 }}>Total Customer Revenue Tracked</div>
          <div style={{ fontSize: 32, fontWeight: 800 }}>{money(customerRevenue)}</div>
        </div>
      )}
    </>
  )
}
