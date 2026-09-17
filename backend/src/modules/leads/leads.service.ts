import type { ZodIssue } from 'zod'
import { leadInputSchema } from '@business-os/shared'
import { leadsRepository } from './leads.repository.js'
import { classifyLead } from '../ai/ai.service.js'
import { logger } from '../../common/logger.js'
import { LeadModel } from './leads.model.js'

export function leadsService(organizationId: string) {
  const repo = leadsRepository(organizationId)

  return {
    async getAll() {
      return repo.list()
    },

    async getById(id: string) {
      const lead = await repo.findById(id)
      if (!lead) throw Object.assign(new Error('Lead not found.'), { status: 404 })
      return lead
    },

    async create(raw: unknown, userId: string) {
      const parsed = leadInputSchema.safeParse(raw)
      if (!parsed.success) {
        throw Object.assign(
          new Error('Invalid lead data: ' + parsed.error.issues.map((i: ZodIssue) => i.message).join(', ')),
          { status: 400 },
        )
      }
      const lead = await repo.create(parsed.data, userId)

      // ── Fire-and-forget AI scoring (never blocks the HTTP response) ──────────
      setImmediate(async () => {
        try {
          const classification = await classifyLead({
            name:           lead.name,
            source:         lead.source,
            status:         lead.status,
            notes:          lead.notes,
            estimatedValue: lead.estimatedValue,
            company:        lead.company,
          })
          await LeadModel.findByIdAndUpdate(lead._id, {
            $set: { score: classification.score, intent: classification.intent },
          })
          logger.info({ leadId: lead._id, ...classification }, '[AI] Lead scored')
        } catch (err) {
          logger.warn({ leadId: lead._id, err }, '[AI] Lead scoring failed (non-critical)')
        }
      })

      return lead
    },

    async update(id: string, raw: unknown) {
      if (!/^[a-f\d]{24}$/i.test(id)) {
        throw Object.assign(new Error('Invalid lead ID.'), { status: 400 })
      }
      const parsed = leadInputSchema.partial().safeParse(raw)
      if (!parsed.success) {
        throw Object.assign(
          new Error('Invalid lead data: ' + parsed.error.issues.map((i: ZodIssue) => i.message).join(', ')),
          { status: 400 },
        )
      }
      const lead = await repo.update(id, parsed.data)
      if (!lead) throw Object.assign(new Error('Lead not found.'), { status: 404 })
      return lead
    },

    async remove(id: string) {
      if (!/^[a-f\d]{24}$/i.test(id)) {
        throw Object.assign(new Error('Invalid lead ID.'), { status: 400 })
      }
      const lead = await repo.delete(id)
      if (!lead) throw Object.assign(new Error('Lead not found.'), { status: 404 })
      return lead
    },

    async getPipelineSummary() {
      return repo.countByStatus()
    },
  }
}
