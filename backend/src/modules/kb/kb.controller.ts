import type { Request, Response } from 'express'
import { kbService } from './kb.service.js'

function getSvc(req: Request) {
  return kbService(req.tenant!.orgId)
}

function handleError(res: Response, error: unknown) {
  const err = error as Error & { status?: number }
  res.status(err.status || 503).json({ error: err.message || 'Unexpected error.' })
}

export const kbController = {
  async list(req: Request, res: Response) {
    try {
      const entries = await getSvc(req).getAll()
      res.json({ entries })
    } catch (error) { handleError(res, error) }
  },

  async create(req: Request, res: Response) {
    try {
      const { category, key, value } = req.body
      if (!category || !key || !value) {
        res.status(400).json({ error: 'category, key and value are required.' })
        return
      }
      const entry = await getSvc(req).create({ category, key, value }, req.tenant!.userId)
      res.status(201).json({ entry })
    } catch (error) { handleError(res, error) }
  },

  async update(req: Request, res: Response) {
    try {
      const entry = await getSvc(req).update(String(req.params.id), req.body)
      if (!entry) { res.status(404).json({ error: 'Entry not found.' }); return }
      res.json({ entry })
    } catch (error) { handleError(res, error) }
  },

  async remove(req: Request, res: Response) {
    try {
      await getSvc(req).remove(String(req.params.id))
      res.status(204).end()
    } catch (error) { handleError(res, error) }
  },

  /** Used by AI service internally — returns formatted context string */
  async context(req: Request, res: Response) {
    try {
      const context = await getSvc(req).buildContext()
      res.json({ context })
    } catch (error) { handleError(res, error) }
  },
}
