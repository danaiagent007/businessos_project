import { KBModel } from './kb.model.js'

export type KBCategory =
  | 'services' | 'pricing' | 'faq' | 'hours'
  | 'policies' | 'locations' | 'products' | 'other'

export interface KBEntry {
  _id: string
  organizationId: string
  category: KBCategory
  key: string
  value: string
  isActive: boolean
  createdBy: string
  createdAt: string
  updatedAt: string
}

export function kbService(orgId: string) {
  return {
    /** Return all active entries for the org, grouped by category */
    async getAll(): Promise<KBEntry[]> {
      return KBModel.find({ organizationId: orgId }).sort({ category: 1, createdAt: -1 }).lean()
    },

    /** Return entries for a specific category */
    async getByCategory(category: KBCategory): Promise<KBEntry[]> {
      return KBModel.find({ organizationId: orgId, category, isActive: true }).lean()
    },

    /** Build a compact context string for injecting into AI prompts */
    async buildContext(): Promise<string> {
      const entries = await KBModel.find({ organizationId: orgId, isActive: true }).lean()
      if (!entries.length) return ''

      const grouped: Record<string, string[]> = {}
      for (const e of entries) {
        if (!grouped[e.category]) grouped[e.category] = []
        grouped[e.category].push(`  • ${e.key}: ${e.value}`)
      }

      const lines: string[] = ['=== Business Knowledge ===']
      for (const [cat, items] of Object.entries(grouped)) {
        lines.push(`[${cat.toUpperCase()}]`)
        lines.push(...items)
      }
      return lines.join('\n')
    },

    async create(data: { category: KBCategory; key: string; value: string }, userId: string): Promise<KBEntry> {
      const entry = await KBModel.create({ ...data, organizationId: orgId, createdBy: userId })
      return entry.toObject()
    },

    async update(id: string, data: Partial<{ key: string; value: string; isActive: boolean }>): Promise<KBEntry | null> {
      return KBModel.findOneAndUpdate({ _id: id, organizationId: orgId }, data, { new: true }).lean()
    },

    async remove(id: string): Promise<void> {
      await KBModel.deleteOne({ _id: id, organizationId: orgId })
    },
  }
}
