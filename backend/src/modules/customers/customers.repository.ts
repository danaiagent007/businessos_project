import { CustomerModel } from './customers.model.js'

export function customersRepository(organizationId: string) {
  const base = { organizationId }

  return {
    async list() {
      return CustomerModel.find(base).sort({ createdAt: -1 }).lean()
    },

    async findById(id: string) {
      return CustomerModel.findOne({ ...base, _id: id }).lean()
    },

    async create(data: Record<string, unknown>, userId: string) {
      return CustomerModel.create({ ...data, organizationId, createdBy: userId })
    },

    async update(id: string, data: Record<string, unknown>) {
      return CustomerModel.findOneAndUpdate(
        { ...base, _id: id },
        { $set: data },
        { new: true, lean: true },
      )
    },

    async delete(id: string) {
      return CustomerModel.findOneAndDelete({ ...base, _id: id }).lean()
    },

    async stats() {
      const [total, active, totalSpend] = await Promise.all([
        CustomerModel.countDocuments(base),
        CustomerModel.countDocuments({ ...base, status: 'active' }),
        CustomerModel.aggregate([
          { $match: base },
          { $group: { _id: null, sum: { $sum: '$totalSpend' } } },
        ]),
      ])
      return {
        total,
        active,
        churned: total - active,
        totalSpend: totalSpend[0]?.sum ?? 0,
      }
    },
  }
}
