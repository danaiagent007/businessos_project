import { z } from 'zod'

// ─── Lead Zod schemas ────────────────────────────────────────────────────────

export const leadInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.union([z.string().email(), z.literal('')]).optional().default(''),
  company: z.string().trim().max(120).optional().default(''),
  estimatedValue: z.number().min(0).max(1_000_000_000).default(0),
  source: z.enum(['manual', 'website', 'whatsapp', 'instagram']).default('manual'),
  status: z.enum(['new', 'contacted', 'qualified', 'won', 'lost']).default('new'),
  nextFollowupAt: z.union([z.string().date(), z.literal('')]).optional().default(''),
  notes: z.string().max(4000).optional().default(''),
})

export type LeadInput = z.infer<typeof leadInputSchema>

// ─── Lead shape returned from API ────────────────────────────────────────────

export interface Lead extends LeadInput {
  _id: string
  organizationId: string
  createdBy: string
  score: number          // 0–100, AI generated
  intent: string         // e.g. "high_purchase_intent"
  lastContactAt: string  // ISO date
  assignedTo?: string    // userId
  createdAt: string
  updatedAt: string
}

// ─── API response shapes ──────────────────────────────────────────────────────

export interface LeadListResponse {
  leads: Lead[]
}

export interface LeadResponse {
  lead: Lead
}

export interface ErrorResponse {
  error: string
}
