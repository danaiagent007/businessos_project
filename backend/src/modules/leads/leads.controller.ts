import type { Request, Response } from 'express'
import { leadsService } from './leads.service.js'
import { aiService } from '../ai/ai.service.js'
import { kbService } from '../kb/kb.service.js'

function getService(req: Request) {
  return leadsService(req.tenant!.orgId)
}

function handleError(res: Response, error: unknown) {
  const err = error as Error & { status?: number }
  res.status(err.status || 503).json({ error: err.message || 'Unexpected error.' })
}

export const leadsController = {
  async list(req: Request, res: Response) {
    try {
      const leads = await getService(req).getAll()
      res.json({ leads })
    } catch (error) {
      handleError(res, error)
    }
  },

  async getOne(req: Request, res: Response) {
    try {
      const lead = await getService(req).getById(String(req.params.id))
      res.json({ lead })
    } catch (error) {
      handleError(res, error)
    }
  },

  async create(req: Request, res: Response) {
    try {
      const lead = await getService(req).create(req.body, req.tenant!.userId)
      res.status(201).json({ lead })
    } catch (error) {
      handleError(res, error)
    }
  },

  async update(req: Request, res: Response) {
    try {
      const lead = await getService(req).update(String(req.params.id), req.body)
      res.json({ lead })
    } catch (error) {
      handleError(res, error)
    }
  },

  async remove(req: Request, res: Response) {
    try {
      await getService(req).remove(String(req.params.id))
      res.status(204).end()
    } catch (error) {
      handleError(res, error)
    }
  },

  async pipeline(req: Request, res: Response) {
    try {
      const summary = await getService(req).getPipelineSummary()
      res.json({ summary })
    } catch (error) {
      handleError(res, error)
    }
  },

  async generateFollowup(req: Request, res: Response) {
    try {
      const lead = await getService(req).getById(String(req.params.id))
      if (!lead) {
        res.status(404).json({ error: 'Lead not found' })
        return
      }
      const style = (req.body?.style as string) || 'whatsapp'
      // Load business KB context to make the AI message more accurate
      const kbContext = await kbService(req.tenant!.orgId).buildContext()
      const message = await aiService.generateFollowup(
        { name: lead.name, company: lead.company || '', status: lead.status, notes: lead.notes || '' },
        style,
        kbContext,
      )
      res.json({ message, style })
    } catch (error) {
      handleError(res, error)
    }
  },
}
