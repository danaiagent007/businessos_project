import { z } from 'zod'
import { customersRepository } from './customers.repository.js'

const customerInput = z.object({
  name:               z.string().min(1),
  email:              z.string().email().or(z.literal('')).optional(),
  phone:              z.string().optional(),
  company:            z.string().optional(),
  industry:           z.string().optional(),
  totalSpend:         z.number().min(0).optional(),
  status:             z.enum(['active', 'inactive', 'churned']).optional(),
  tags:               z.array(z.string()).optional(),
  notes:              z.string().optional(),
  assignedTo:         z.string().optional(),
  convertedFromLead:  z.string().optional(),
})

export function customersService(organizationId: string) {
  const repo = customersRepository(organizationId)

  return {
    async getAll() { return repo.list() },

    async getById(id: string) {
      const c = await repo.findById(id)
      if (!c) throw Object.assign(new Error('Customer not found.'), { status: 404 })
      return c
    },

    async create(raw: unknown, userId: string) {
      const parsed = customerInput.safeParse(raw)
      if (!parsed.success) {
        throw Object.assign(
          new Error('Invalid customer: ' + parsed.error.issues.map(i => i.message).join(', ')),
          { status: 400 },
        )
      }
      return repo.create(parsed.data as Record<string, unknown>, userId)
    },

    async update(id: string, raw: unknown) {
      if (!/^[a-f\d]{24}$/i.test(id))
        throw Object.assign(new Error('Invalid ID.'), { status: 400 })
      const parsed = customerInput.partial().safeParse(raw)
      if (!parsed.success)
        throw Object.assign(
          new Error('Invalid customer: ' + parsed.error.issues.map(i => i.message).join(', ')),
          { status: 400 },
        )
      const c = await repo.update(id, parsed.data as Record<string, unknown>)
      if (!c) throw Object.assign(new Error('Customer not found.'), { status: 404 })
      return c
    },

    async remove(id: string) {
      if (!/^[a-f\d]{24}$/i.test(id))
        throw Object.assign(new Error('Invalid ID.'), { status: 400 })
      const c = await repo.delete(id)
      if (!c) throw Object.assign(new Error('Customer not found.'), { status: 404 })
      return c
    },

    async getStats() { return repo.stats() },
  }
}
