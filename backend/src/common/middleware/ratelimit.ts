import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { config } from '../../config/index.js'
import type { Request, Response, NextFunction } from 'express'

const redis = new Redis({
  url: config.redis.url,
  token: config.redis.token,
})

// Per-org rate limiter: 60 writes per minute
const writeLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, '1m'),
  prefix: 'business-os:write',
})

// Per-org rate limiter: 120 reads per minute
const readLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(120, '1m'),
  prefix: 'business-os:read',
})

export function rateLimit(type: 'read' | 'write' = 'write') {
  const limiter = type === 'read' ? readLimiter : writeLimiter
  return async (req: Request, res: Response, next: NextFunction) => {
    const key = req.tenant?.orgId || req.ip || 'anonymous'
    try {
      const { success, remaining, reset } = await limiter.limit(key)
      res.setHeader('X-RateLimit-Remaining', remaining)
      res.setHeader('X-RateLimit-Reset', reset)
      if (!success) {
        res.status(429).json({ error: 'Too many requests. Please slow down and try again.' })
        return
      }
      next()
    } catch {
      // If Redis is down, fail open (don't block requests)
      next()
    }
  }
}
