import type { Request, Response } from 'express'
import { customersService } from './customers.service.js'

function svc(req: Request) {
  return customersService(req.tenant!.orgId)
}

function handleError(res: Response, error: unknown) {
  const err = error as Error & { status?: number }
  res.status(err.status || 503).json({ error: err.message || 'Unexpected error.' })
}

export const customersController = {
  async list(req: Request, res: Response) {
    try { res.json({ customers: await svc(req).getAll() }) }
    catch (e) { handleError(res, e) }
  },

  async getOne(req: Request, res: Response) {
    try { res.json({ customer: await svc(req).getById(String(req.params.id)) }) }
    catch (e) { handleError(res, e) }
  },

  async create(req: Request, res: Response) {
    try { res.status(201).json({ customer: await svc(req).create(req.body, req.tenant!.userId) }) }
    catch (e) { handleError(res, e) }
  },

  async update(req: Request, res: Response) {
    try { res.json({ customer: await svc(req).update(String(req.params.id), req.body) }) }
    catch (e) { handleError(res, e) }
  },

  async remove(req: Request, res: Response) {
    try { await svc(req).remove(String(req.params.id)); res.status(204).end() }
    catch (e) { handleError(res, e) }
  },

  async stats(req: Request, res: Response) {
    try { res.json({ stats: await svc(req).getStats() }) }
    catch (e) { handleError(res, e) }
  },
}
