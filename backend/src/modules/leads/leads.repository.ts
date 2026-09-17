import type { LeadInput } from '@business-os/shared'
import { LeadModel } from './leads.model.js'
import { connectDB } from '../../common/db.js'

export function leadsRepository(organizationId: string) {
  if (!organizationId) throw new Error('organizationId is required')

  // Every method automatically scopes to the org — no way to leak across tenants
  return {
    async list() {
      await connectDB()
      return LeadModel.find({ organizationId })
        .sort({ createdAt: -1 })
        .limit(500)
        .lean()
    },

    async findById(id: string) {
      await connectDB()
      return LeadModel.findOne({ _id: id, organizationId }).lean()
    },

    async create(input: LeadInput, createdBy: string) {
      await connectDB()
      return LeadModel.create({ ...input, organizationId, createdBy })
    },

    async update(id: string, input: Partial<LeadInput>) {
      await connectDB()
      return LeadModel.findOneAndUpdate(
        { _id: id, organizationId },   // org-scoped: can't update another org's lead
        { $set: input },
        { new: true, runValidators: true },
      ).lean()
    },

    async delete(id: string) {
      await connectDB()
      return LeadModel.findOneAndDelete({ _id: id, organizationId }).lean()
    },

    async countByStatus() {
      await connectDB()
      return LeadModel.aggregate([
        { $match: { organizationId } },
        { $group: { _id: '$status', count: { $sum: 1 }, totalValue: { $sum: '$estimatedValue' } } },
      ])
    },
  }
}
