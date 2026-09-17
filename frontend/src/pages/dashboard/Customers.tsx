import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useApiClient } from '@/lib/api'
import { Loader2, Plus, Search, Users2, Building2 } from 'lucide-react'
import { money } from '@/lib/utils'
import { useOrganization } from '@clerk/clerk-react'

interface Customer {
  _id: string
  name: string
  email: string
  phone: string
  company: string
  industry: string
  totalSpend: number
  status: 'active' | 'inactive' | 'churned'
  notes: string
  createdAt: string
}

const statusColor: Record<string, string> = { active: '#16a34a', inactive: '#d97706', churned: '#dc2626' }
const statusBg:    Record<string, string> = { active: '#dcfce7', inactive: '#fef3c7', churned: '#fee2e2' }

function CustomerForm({ customer, onClose, onSaved }: { customer?: Customer; onClose: () => void; onSaved: () => void }) {
  const api = useApiClient()
  const qc = useQueryClient()
  const [form, setForm] = useState({
    name: customer?.name ?? '', email: customer?.email ?? '', phone: customer?.phone ?? '',
    company: customer?.company ?? '', industry: customer?.industry ?? '',
    totalSpend: customer?.totalSpend ?? 0, status: customer?.status ?? 'active', notes: customer?.notes ?? '',
  })

  const mutation = useMutation({
    mutationFn: (data: typeof form) =>
      customer ? api.customers.update(customer._id, data) : api.customers.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers'] }); onSaved() },
  })

  const f = (field: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(p => ({ ...p, [field]: e.target.value }))

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ background: 'white', borderRadius: 12, padding: 28, width: 480, maxHeight: '90vh', overflowY: 'auto' }}>
        <h2 style={{ margin: '0 0 20px', fontSize: 18 }}>{customer ? 'Edit Customer' : 'Add Customer'}</h2>
        {(['name', 'email', 'phone', 'company', 'industry'] as const).map(field => (
          <div key={field} style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'capitalize', display: 'block', marginBottom: 4 }}>{field}</label>
            <input id={`customer-${field}`} value={form[field]} onChange={f(field)}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #e0dce8', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }} />
          </div>
        ))}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Total Spend ($)</label>
          <input id="customer-totalSpend" type="number" min={0} value={form.totalSpend}
            onChange={e => setForm(p => ({ ...p, totalSpend: Number(e.target.value) }))}
            style={{ width: '100%', padding: '8px 10px', border: '1px solid #e0dce8', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Status</label>
          <select id="customer-status" value={form.status} onChange={f('status')}
            style={{ width: '100%', padding: '8px 10px', border: '1px solid #e0dce8', borderRadius: 6, fontSize: 13 }}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="churned">Churned</option>
          </select>
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Notes</label>
          <textarea id="customer-notes" value={form.notes} onChange={f('notes')} rows={3}
            style={{ width: '100%', padding: '8px 10px', border: '1px solid #e0dce8', borderRadius: 6, fontSize: 13, boxSizing: 'border-box', resize: 'vertical' }} />
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button id="customer-cancel" onClick={onClose}
            style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #e0dce8', fontSize: 13 }}>Cancel</button>
          <button id="customer-save" onClick={() => mutation.mutate(form)} disabled={!form.name || mutation.isPending}
            style={{ padding: '8px 16px', borderRadius: 6, background: '#7450d7', color: 'white', fontSize: 13, fontWeight: 600, opacity: mutation.isPending ? .7 : 1 }}>
            {mutation.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function CustomersPage() {
  const api = useApiClient()
  const { organization } = useOrganization()
  const qc = useQueryClient()
  const [search, setSearch]     = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [selected, setSelected] = useState<Customer | undefined>()

  const { data: customers = [], isLoading, error } = useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: () => api.customers.list().then(r => (r as { customers: Customer[] }).customers),
    enabled: !!organization,
  })

  const filtered = customers.filter(c => `${c.name} ${c.email} ${c.company}`.toLowerCase().includes(search.toLowerCase()))

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">YOUR BUSINESS, IN FOCUS</div>
          <h1>Customers</h1>
          <p>People who trust you. Relationships that grow.</p>
        </div>
        <div className="heading-actions">
          <button id="add-customer-btn" onClick={() => { setSelected(undefined); setFormOpen(true) }} disabled={!organization}
            style={{ fontSize: 11, height: 34, padding: '0 13px', borderRadius: 6, background: '#7450d7', color: 'white', fontWeight: 550 }}>
            <Plus size={14} style={{ display: 'inline', marginRight: 4 }} />Add customer
          </button>
        </div>
      </div>

      {error && <div role="alert" className="error-banner">{(error as Error).message}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total',       value: customers.length,                                                          icon: <Users2 size={20} /> },
          { label: 'Active',      value: customers.filter(c => c.status === 'active').length,                       icon: <Building2 size={20} /> },
          { label: 'Total Spend', value: money(customers.reduce((s, c) => s + (c.totalSpend || 0), 0)), icon: <span style={{ fontSize: 18 }}>💰</span> },
        ].map(({ label, value, icon }) => (
          <div key={label} style={{ background: 'white', borderRadius: 10, padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,.07)' }}>
            <div style={{ color: '#7450d7', marginBottom: 8 }}>{icon}</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
            <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      <section className="panel">
        <div className="panel-heading">
          <h2>All customers <span className="small-pill">{customers.length}</span></h2>
        </div>
        <div className="search-field">
          <Search size={16} />
          <input id="customer-search" aria-label="Search customers"
            placeholder="Search by name, company, or email..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {isLoading
          ? <div style={{ padding: 48, display: 'flex', justifyContent: 'center' }}><Loader2 className="animate-spin" /></div>
          : filtered.length
            ? <div className="table-scroll">
                <table>
                  <thead><tr><th>Customer</th><th>Company</th><th>Status</th><th>Total Spend</th><th>Since</th><th><span className="sr-only">Edit</span></th></tr></thead>
                  <tbody>
                    {filtered.map(c => (
                      <tr key={c._id}>
                        <td><strong>{c.name}</strong><small>{c.email || 'No email'}</small></td>
                        <td>{c.company || '—'}</td>
                        <td>
                          <span style={{ background: statusBg[c.status] || '#f0f0f4', color: statusColor[c.status] || '#555', borderRadius: 4, padding: '2px 7px', fontSize: 10, fontWeight: 700, textTransform: 'capitalize' }}>
                            {c.status}
                          </span>
                        </td>
                        <td>{money(c.totalSpend)}</td>
                        <td>{new Date(c.createdAt).toLocaleDateString()}</td>
                        <td>
                          <button id={`edit-customer-${c._id}`} style={{ color: '#7450d7', fontSize: 11 }}
                            onClick={() => { setSelected(c); setFormOpen(true) }}>
                            Edit<span className="sr-only"> {c.name}</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            : <div style={{ padding: '64px 24px', textAlign: 'center', color: '#9991a4' }}>
                <Users2 size={32} style={{ margin: '0 auto 12px', opacity: .4 }} />
                <p style={{ fontSize: 13 }}>Convert your first lead into a customer</p>
                <button onClick={() => { setSelected(undefined); setFormOpen(true) }}
                  style={{ marginTop: 16, fontSize: 11, padding: '8px 14px', borderRadius: 6, background: '#7450d7', color: 'white', fontWeight: 550 }}>
                  Add customer
                </button>
              </div>
        }
      </section>

      {formOpen && (
        <CustomerForm key={selected?._id || 'new'} customer={selected}
          onClose={() => setFormOpen(false)}
          onSaved={() => { qc.invalidateQueries({ queryKey: ['customers'] }); setFormOpen(false) }} />
      )}
    </>
  )
}
