import type { Request, Response, NextFunction } from 'express'
import { logger } from '../logger.js'

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const error = err instanceof Error ? err : new Error(String(err))
  logger.error({ err: error, path: req.path, method: req.method }, 'Unhandled error')

  // Don't leak internal errors in production
  const message =
    process.env.NODE_ENV === 'development'
      ? error.message
      : 'Something went wrong. Please try again.'

  res.status(500).json({ error: message })
}

export function notFound(req: Request, res: Response) {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found.` })
}
