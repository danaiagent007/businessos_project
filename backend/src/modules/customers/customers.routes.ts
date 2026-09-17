import { Router } from 'express'
import { customersController } from './customers.controller.js'
import { mustHaveOrg, requireRole, CRM_READ_ROLES, CRM_WRITE_ROLES } from '../../common/middleware/auth.js'
import { rateLimit } from '../../common/middleware/ratelimit.js'

export const customersRouter = Router()

customersRouter.get('/',       mustHaveOrg, requireRole(...CRM_READ_ROLES),  rateLimit('read'),  customersController.list)
customersRouter.get('/stats',  mustHaveOrg, requireRole(...CRM_READ_ROLES),  rateLimit('read'),  customersController.stats)
customersRouter.get('/:id',    mustHaveOrg, requireRole(...CRM_READ_ROLES),  rateLimit('read'),  customersController.getOne)
customersRouter.post('/',      mustHaveOrg, requireRole(...CRM_WRITE_ROLES), rateLimit('write'), customersController.create)
customersRouter.patch('/:id',  mustHaveOrg, requireRole(...CRM_WRITE_ROLES), rateLimit('write'), customersController.update)
customersRouter.delete('/:id', mustHaveOrg, requireRole(...CRM_WRITE_ROLES), rateLimit('write'), customersController.remove)
