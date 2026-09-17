import { useState } from 'react'
import type { Lead, LeadInput } from '@business-os/shared'
import { useCreateLead, useUpdateLead } from '@/hooks/useLeads'

interface Props {
  lead?: Lead
  onClose: () => void
  onSaved: () => void
}

export function LeadEditor({ lead, onClose, onSaved }: Props) {
  const createLead = useCreateLead()
  const updateLead = useUpdateLead()
  const [error, setError] = useState('')
  const busy = createLead.isPending || updateLead.isPending

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const form = new FormData(e.currentTarget)
    const data: LeadInput = {
      name: form.get('name') as string,
      email: (form.get('email') as string) || '',
      company: (form.get('company') as string) || '',
      estimatedValue: Number(form.get('estimatedValue')) || 0,
      source: (form.get('source') as LeadInput['source']) || 'manual',
      status: (form.get('status') as LeadInput['status']) || 'new',
      nextFollowupAt: (form.get('nextFollowupAt') as string) || '',
      notes: (form.get('notes') as string) || '',
    }
    try {
      if (lead) {
        await updateLead.mutateAsync({ id: lead._id, ...data })
      } else {
        await createLead.mutateAsync(data)
      }
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save lead.')
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={lead ? 'Edit lead' : 'Add lead'}
      style={{ position: 'fixed', inset: 0, background: '#15102050', zIndex: 50, display: 'grid', placeItems: 'center', padding: 16 }}
      onClick={onClose}
    >
      <div
        style={{ background: 'white', borderRadius: 12, padding: '28px', maxWidth: 480, width: '100%', boxShadow: '0 20px 60px #0002', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ fontSize: 15, fontWeight: 560 }}>{lead ? 'Edit lead' : 'A new relationship starts here'}</h2>
        <p style={{ fontSize: 12, color: '#7b7c89', marginTop: 4, marginBottom: 20 }}>Add the details. Keep every opportunity in focus.</p>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, fontWeight: 550 }}>
            Full name *
            <input name="name" defaultValue={lead?.name} required minLength={2} maxLength={120} placeholder="e.g. Alex Morgan" style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '8px 10px', fontSize: 13 }} />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, fontWeight: 550 }}>
              Email
              <input name="email" type="email" defaultValue={lead?.email} placeholder="alex@company.com" style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '8px 10px', fontSize: 13 }} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, fontWeight: 550 }}>
              Company
              <input name="company" defaultValue={lead?.company} placeholder="Company name" maxLength={120} style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '8px 10px', fontSize: 13 }} />
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, fontWeight: 550 }}>
              Deal value (USD)
              <input name="estimatedValue" type="number" min="0" max="1000000000" step="0.01" defaultValue={lead?.estimatedValue ?? 0} required style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '8px 10px', fontSize: 13 }} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, fontWeight: 550 }}>
              Next follow-up
              <input name="nextFollowupAt" type="date" defaultValue={lead?.nextFollowupAt} style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '8px 10px', fontSize: 13 }} />
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, fontWeight: 550 }}>
              Source
              <select name="source" defaultValue={lead?.source || 'manual'} className="form-select">
                {['manual', 'website', 'whatsapp', 'instagram'].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, fontWeight: 550 }}>
              Stage
              <select name="status" defaultValue={lead?.status || 'new'} className="form-select">
                {['new', 'contacted', 'qualified', 'won', 'lost'].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
          </div>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, fontWeight: 550 }}>
            Notes
            <textarea name="notes" defaultValue={lead?.notes} placeholder="What should your team know?" maxLength={4000} style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '8px 10px', fontSize: 13, minHeight: 80, resize: 'vertical' }} />
          </label>

          {error && <p role="alert" style={{ color: '#a74b47', fontSize: 12 }}>{error}</p>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
            <button type="button" onClick={onClose} style={{ padding: '8px 14px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12 }}>Cancel</button>
            <button type="submit" disabled={busy} style={{ padding: '8px 14px', background: '#7450d7', color: 'white', borderRadius: 6, fontSize: 12, fontWeight: 550, opacity: busy ? .7 : 1 }}>
              {busy ? 'Saving…' : lead ? 'Save changes' : 'Create lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
