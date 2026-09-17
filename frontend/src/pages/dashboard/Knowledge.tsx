import { useState, useEffect, useCallback } from 'react'
import {
  Brain, Plus, Trash2, Pencil, Check, X, Loader2,
  DollarSign, Clock, HelpCircle, MapPin, ShieldCheck, Package, Store, MoreHorizontal,
  Sparkles, Eye,
} from 'lucide-react'
import { useApiClient } from '@/lib/api'

type KBCategory = 'services' | 'pricing' | 'faq' | 'hours' | 'policies' | 'locations' | 'products' | 'other'

interface KBEntry {
  _id: string
  category: KBCategory
  key: string
  value: string
  isActive: boolean
}

const CATEGORIES: { id: KBCategory; label: string; icon: React.ElementType; color: string; desc: string }[] = [
  { id: 'pricing',   label: 'Pricing',   icon: DollarSign,  color: '#16a34a', desc: 'Service prices & packages' },
  { id: 'services',  label: 'Services',  icon: Store,       color: '#7450d7', desc: 'What you offer' },
  { id: 'faq',       label: 'FAQ',       icon: HelpCircle,  color: '#0891b2', desc: 'Common questions & answers' },
  { id: 'hours',     label: 'Hours',     icon: Clock,       color: '#d97706', desc: 'Working hours & availability' },
  { id: 'products',  label: 'Products',  icon: Package,     color: '#db2777', desc: 'Products you sell' },
  { id: 'locations', label: 'Locations', icon: MapPin,      color: '#dc2626', desc: 'Branches & addresses' },
  { id: 'policies',  label: 'Policies',  icon: ShieldCheck, color: '#6366f1', desc: 'Refunds, returns, T&Cs' },
  { id: 'other',     label: 'Other',     icon: MoreHorizontal, color: '#64748b', desc: 'Anything else' },
]

const CAT_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]))

/** Inline editable row */
function EntryRow({ entry, onSave, onDelete }: {
  entry: KBEntry
  onSave: (id: string, key: string, value: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [key, setKey]         = useState(entry.key)
  const [value, setValue]     = useState(entry.value)
  const [saving, setSaving]   = useState(false)

  async function save() {
    if (!key.trim() || !value.trim()) return
    setSaving(true)
    await onSave(entry._id, key.trim(), value.trim())
    setSaving(false)
    setEditing(false)
  }

  function cancel() { setKey(entry.key); setValue(entry.value); setEditing(false) }

  if (editing) {
    return (
      <tr>
        <td style={{ padding: '8px 12px' }}>
          <input value={key} onChange={(e) => setKey(e.target.value)}
            style={{ width: '100%', border: '1.5px solid #7450d7', borderRadius: 6, padding: '5px 8px', fontSize: 12, outline: 'none' }} />
        </td>
        <td style={{ padding: '8px 12px' }}>
          <input value={value} onChange={(e) => setValue(e.target.value)}
            style={{ width: '100%', border: '1.5px solid #7450d7', borderRadius: 6, padding: '5px 8px', fontSize: 12, outline: 'none' }} />
        </td>
        <td style={{ padding: '8px 12px', display: 'flex', gap: 6 }}>
          <button onClick={save} disabled={saving}
            style={{ background: '#7450d7', color: 'white', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            {saving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />} Save
          </button>
          <button onClick={cancel} style={{ background: '#f0eff5', border: 'none', borderRadius: 6, padding: '4px 8px', fontSize: 11, cursor: 'pointer', color: '#9991a4' }}>
            <X size={11} />
          </button>
        </td>
      </tr>
    )
  }

  return (
    <tr style={{ background: entry.isActive ? 'transparent' : '#f9f9fb' }}>
      <td style={{ padding: '9px 12px', fontSize: 13, color: '#2d2440', fontWeight: 500 }}>{entry.key}</td>
      <td style={{ padding: '9px 12px', fontSize: 12, color: '#6b5f7a' }}>{entry.value}</td>
      <td style={{ padding: '9px 12px', display: 'flex', gap: 6 }}>
        <button onClick={() => setEditing(true)} title="Edit"
          style={{ background: '#f5f4fb', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: '#7450d7', display: 'flex', alignItems: 'center' }}>
          <Pencil size={12} />
        </button>
        <button onClick={() => onDelete(entry._id)} title="Delete"
          style={{ background: '#fff0f0', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: '#dc2626', display: 'flex', alignItems: 'center' }}>
          <Trash2 size={12} />
        </button>
      </td>
    </tr>
  )
}

/** Add entry form */
function AddEntryForm({ category, onAdd }: { category: KBCategory; onAdd: (key: string, value: string) => Promise<void> }) {
  const [open, setOpen]   = useState(false)
  const [key, setKey]     = useState('')
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!key.trim() || !value.trim()) return
    setSaving(true)
    await onAdd(key.trim(), value.trim())
    setKey(''); setValue('')
    setSaving(false)
    setOpen(false)
  }

  if (!open) return (
    <button onClick={() => setOpen(true)}
      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, border: '1.5px dashed #c8c4d8', background: 'transparent', color: '#9991a4', fontSize: 11, cursor: 'pointer', width: '100%', marginTop: 4 }}>
      <Plus size={12} /> Add entry
    </button>
  )

  return (
    <form onSubmit={submit} style={{ display: 'flex', gap: 8, marginTop: 6, padding: '10px 12px', background: '#f9f8ff', borderRadius: 8, border: '1.5px solid #e0dcf5' }}>
      <input placeholder="e.g. haircut+facial" value={key} onChange={(e) => setKey(e.target.value)}
        style={{ flex: 1, border: '1.5px solid #e0dcf5', borderRadius: 6, padding: '6px 9px', fontSize: 12, outline: 'none' }} />
      <input placeholder="e.g. ₹1,000 — 90 mins" value={value} onChange={(e) => setValue(e.target.value)}
        style={{ flex: 2, border: '1.5px solid #e0dcf5', borderRadius: 6, padding: '6px 9px', fontSize: 12, outline: 'none' }} />
      <button type="submit" disabled={saving}
        style={{ background: '#7450d7', color: 'white', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
        {saving ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />} Add
      </button>
      <button type="button" onClick={() => setOpen(false)}
        style={{ background: '#f0eff5', border: 'none', borderRadius: 6, padding: '6px 8px', cursor: 'pointer', color: '#9991a4' }}>
        <X size={11} />
      </button>
    </form>
  )
}

export function KnowledgePage() {
  const api = useApiClient()
  const [entries, setEntries]     = useState<KBEntry[]>([])
  const [loading, setLoading]     = useState(true)
  const [activeTab, setActiveTab] = useState<KBCategory>('pricing')
  const [contextOpen, setContextOpen] = useState(false)
  const [context, setContext]     = useState('')
  const [contextLoading, setContextLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.kb.list()
      setEntries(res.entries as KBEntry[])
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = entries.filter((e) => e.category === activeTab)

  async function handleAdd(key: string, value: string) {
    await api.kb.create({ category: activeTab, key, value })
    await load()
  }

  async function handleSave(id: string, key: string, value: string) {
    await api.kb.update(id, { key, value })
    await load()
  }

  async function handleDelete(id: string) {
    await api.kb.delete(id)
    await load()
  }

  async function showContext() {
    setContextLoading(true)
    setContextOpen(true)
    try {
      const res = await api.kb.context()
      setContext(res.context || '(No knowledge entries yet — add some above)')
    } catch { setContext('Error loading context') }
    setContextLoading(false)
  }

  const cat = CAT_MAP[activeTab]
  const Icon = cat.icon

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">AI CONFIGURATION</div>
          <h1>Business Knowledge</h1>
          <p>Teach your AI employee what it needs to know. It uses this to answer customer questions accurately.</p>
        </div>
        <div className="heading-actions">
          <button
            id="preview-kb-context-btn"
            onClick={showContext}
            style={{ fontSize: 11, height: 34, padding: '0 13px', borderRadius: 6, background: '#f5f4fb', color: '#7450d7', fontWeight: 550, border: '1.5px solid #e0dcf5', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Eye size={13} /> Preview AI Context
          </button>
        </div>
      </div>

      {/* Hero explanation */}
      <div style={{
        background: 'linear-gradient(135deg, #7450d7 0%, #9b6bff 100%)',
        borderRadius: 14, padding: '18px 22px', marginBottom: 24,
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: 10, display: 'flex', flexShrink: 0 }}>
          <Brain size={22} color="white" />
        </div>
        <div>
          <p style={{ color: 'white', fontWeight: 700, fontSize: 14, margin: '0 0 3px' }}>
            How it works
          </p>
          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, margin: 0, lineHeight: 1.5 }}>
            When a customer asks "What is your haircut price?" — your AI reads from the Pricing entries here and replies accurately.
            Without this, the AI has to guess. Add your real services, prices, FAQs, and hours below.
          </p>
        </div>
        <div style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.12)', borderRadius: 10, padding: '8px 14px', textAlign: 'center', flexShrink: 0 }}>
          <div style={{ color: 'white', fontWeight: 700, fontSize: 20 }}>{entries.length}</div>
          <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 10 }}>Total entries</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 20 }}>
        {/* Category tabs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: 176, flexShrink: 0 }}>
          {CATEGORIES.map(({ id, label, icon: CatIcon, color }) => {
            const count = entries.filter((e) => e.category === id).length
            return (
              <button
                key={id}
                id={`kb-tab-${id}`}
                onClick={() => setActiveTab(id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 9, padding: '9px 12px',
                  borderRadius: 8, border: 'none', cursor: 'pointer', textAlign: 'left',
                  background: activeTab === id ? '#f0ecff' : 'transparent',
                  color: activeTab === id ? '#7450d7' : '#6b5f7a',
                  fontWeight: activeTab === id ? 700 : 500, fontSize: 12,
                }}
              >
                <CatIcon size={14} style={{ color: activeTab === id ? color : '#b5afc8', flexShrink: 0 }} />
                <span style={{ flex: 1 }}>{label}</span>
                {count > 0 && (
                  <span style={{ background: activeTab === id ? '#7450d7' : '#e8e6f0', color: activeTab === id ? 'white' : '#9991a4', borderRadius: 99, padding: '1px 7px', fontSize: 10, fontWeight: 700 }}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Main panel */}
        <section className="panel" style={{ flex: 1, minWidth: 0 }}>
          <div className="panel-heading">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon size={16} style={{ color: cat.color }} /> {cat.label}
              <span className="small-pill" style={{ background: cat.color + '20', color: cat.color }}>{filtered.length}</span>
            </h2>
            <p style={{ fontSize: 11, color: '#9991a4', margin: 0 }}>{cat.desc}</p>
          </div>

          {loading ? (
            <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}><Loader2 className="animate-spin" /></div>
          ) : filtered.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '35%' }}>Key / Label</th>
                    <th>Value</th>
                    <th style={{ width: 90 }}><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((e) => (
                    <EntryRow key={e._id} entry={e} onSave={handleSave} onDelete={handleDelete} />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: '36px 24px', textAlign: 'center', color: '#b5afc8' }}>
              <Icon size={28} style={{ margin: '0 auto 10px', opacity: 0.35 }} />
              <p style={{ fontSize: 12, margin: '0 0 4px', fontWeight: 600, color: '#9991a4' }}>No {cat.label.toLowerCase()} entries yet</p>
              <p style={{ fontSize: 11, margin: 0 }}>Add your first entry below — the AI will use it to answer customer questions.</p>
            </div>
          )}

          <div style={{ padding: '0 12px 16px' }}>
            <AddEntryForm category={activeTab} onAdd={handleAdd} />
          </div>
        </section>
      </div>

      {/* Context preview modal */}
      {contextOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 560, boxShadow: '0 24px 80px rgba(0,0,0,0.22)', overflow: 'hidden' }}>
            <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid #f0eff5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ background: 'linear-gradient(135deg,#7450d7,#9b6bff)', borderRadius: 8, padding: 6, display: 'flex' }}><Sparkles size={14} color="white" /></div>
                <div>
                  <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>AI Context Preview</h2>
                  <p style={{ fontSize: 10, color: '#9991a4', margin: 0 }}>This is what your AI reads before answering customer questions</p>
                </div>
              </div>
              <button onClick={() => setContextOpen(false)} style={{ border: 'none', background: '#f5f4fb', borderRadius: 8, padding: 6, cursor: 'pointer', color: '#9991a4' }}><X size={16} /></button>
            </div>
            <div style={{ padding: 22 }}>
              {contextLoading
                ? <div style={{ padding: 32, display: 'flex', justifyContent: 'center' }}><Loader2 className="animate-spin" style={{ color: '#7450d7' }} /></div>
                : <pre style={{ background: '#f9f8ff', borderRadius: 10, padding: 16, fontSize: 11, lineHeight: 1.7, color: '#2d2440', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 340, overflowY: 'auto', margin: 0 }}>{context}</pre>
              }
            </div>
          </div>
        </div>
      )}
    </>
  )
}
