import { getAuth } from '@clerk/express'
import type { Request, Response, NextFunction } from 'express'

/**
 * Attaches tenant context to every authenticated request.
 * Services should NEVER trust req.body.organizationId for writes —
 * always use req.tenant.orgId derived from the verified Clerk token.
 */
export interface TenantContext {
  userId: string
  orgId: string
  orgRole: string
}

declare global {
  namespace Express {
    interface Request {
      tenant?: TenantContext
    }
  }
}

export function tenantMiddleware(req: Request, res: Response, next: NextFunction) {
  const { userId, orgId, orgRole } = getAuth(req)
  if (userId && orgId) {
    req.tenant = { userId, orgId, orgRole: orgRole || 'org:member' }
  }
  next()
}
