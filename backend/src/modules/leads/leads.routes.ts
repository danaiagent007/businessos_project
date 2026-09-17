import { Router } from 'express'
import { leadsController } from './leads.controller.js'
import { mustHaveOrg, requireRole, CRM_READ_ROLES, CRM_WRITE_ROLES } from '../../common/middleware/auth.js'
import { rateLimit } from '../../common/middleware/ratelimit.js'

export const leadsRouter = Router()

// GET /api/leads — list all leads for the org
leadsRouter.get(
  '/',
  mustHaveOrg,
  requireRole(...CRM_READ_ROLES),
  rateLimit('read'),
  leadsController.list,
)

// GET /api/leads/pipeline — pipeline summary stats
leadsRouter.get(
  '/pipeline',
  mustHaveOrg,
  requireRole(...CRM_READ_ROLES),
  rateLimit('read'),
  leadsController.pipeline,
)

// POST /api/leads/:id/generate-followup — AI follow-up message draft
leadsRouter.post(
  '/:id/generate-followup',
  mustHaveOrg,
  requireRole(...CRM_WRITE_ROLES),
  rateLimit('write'),
  leadsController.generateFollowup,
)

// GET /api/leads/:id — get a single lead
leadsRouter.get(
  '/:id',
  mustHaveOrg,
  requireRole(...CRM_READ_ROLES),
  rateLimit('read'),
  leadsController.getOne,
)

// POST /api/leads — create a lead
leadsRouter.post(
  '/',
  mustHaveOrg,
  requireRole(...CRM_WRITE_ROLES),
  rateLimit('write'),
  leadsController.create,
)

// PATCH /api/leads/:id — update a lead
leadsRouter.patch(
  '/:id',
  mustHaveOrg,
  requireRole(...CRM_WRITE_ROLES),
  rateLimit('write'),
  leadsController.update,
)

// DELETE /api/leads/:id — delete a lead
leadsRouter.delete(
  '/:id',
  mustHaveOrg,
  requireRole(...CRM_WRITE_ROLES),
  rateLimit('write'),
  leadsController.remove,
)
