import { clerkMiddleware, getAuth } from '@clerk/express'
import type { Request, Response, NextFunction } from 'express'

// Clerk request validation middleware — attach to every route
export const requireAuth = clerkMiddleware()

// Guard: must be signed in
export function mustBeSignedIn(req: Request, res: Response, next: NextFunction) {
  const { userId } = getAuth(req)
  if (!userId) {
    res.status(401).json({ error: 'Sign in to access this resource.' })
    return
  }
  next()
}

// Guard: must have an organization selected
export function mustHaveOrg(req: Request, res: Response, next: NextFunction) {
  const { userId, orgId } = getAuth(req)
  if (!userId) {
    res.status(401).json({ error: 'Sign in to access this resource.' })
    return
  }
  if (!orgId) {
    res.status(403).json({ error: 'Select or create an organization to continue.' })
    return
  }
  next()
}

// Guard: role-based access control
// Allowed roles from Clerk: org:owner, org:admin, org:manager, org:member, org:viewer
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { orgRole } = getAuth(req)
    if (!orgRole || !roles.includes(orgRole)) {
      res.status(403).json({ error: 'You do not have permission to perform this action.' })
      return
    }
    next()
  }
}

// Convenience role sets
export const CRM_READ_ROLES = ['org:owner', 'org:admin', 'org:manager', 'org:member', 'org:viewer']
export const CRM_WRITE_ROLES = ['org:owner', 'org:admin', 'org:manager']
export const ADMIN_ROLES = ['org:owner', 'org:admin']
