import { Router } from 'express'
import { kbController } from './kb.controller.js'
import { mustHaveOrg, requireRole, CRM_READ_ROLES, CRM_WRITE_ROLES } from '../../common/middleware/auth.js'
import { rateLimit } from '../../common/middleware/ratelimit.js'

export const kbRouter = Router()

// GET /api/kb — list all KB entries
kbRouter.get('/', mustHaveOrg, requireRole(...CRM_READ_ROLES), rateLimit('read'), kbController.list)

// GET /api/kb/context — AI-ready formatted context string
kbRouter.get('/context', mustHaveOrg, requireRole(...CRM_READ_ROLES), rateLimit('read'), kbController.context)

// POST /api/kb — create entry
kbRouter.post('/', mustHaveOrg, requireRole(...CRM_WRITE_ROLES), rateLimit('write'), kbController.create)

// PATCH /api/kb/:id — update entry
kbRouter.patch('/:id', mustHaveOrg, requireRole(...CRM_WRITE_ROLES), rateLimit('write'), kbController.update)

// DELETE /api/kb/:id — delete entry
kbRouter.delete('/:id', mustHaveOrg, requireRole(...CRM_WRITE_ROLES), rateLimit('write'), kbController.remove)
