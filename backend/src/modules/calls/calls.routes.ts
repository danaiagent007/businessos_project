import { Router } from 'express'
import { requireAuth } from '@clerk/express'
import { CallSession } from './call.model.js'
import { createCallSession, endCallSession } from './voice-agent.service.js'
import { logger } from '../../common/logger.js'
import { getAuth } from '@clerk/express'

export const callsRouter = Router()

// All routes require auth
callsRouter.use(requireAuth())

// ─── POST /api/calls/session — create a new call session ─────────────────────
callsRouter.post('/session', async (req, res) => {
  try {
    const { orgId } = getAuth(req)
    if (!orgId) return res.status(403).json({ error: 'Organization required' })

    const sessionId = await createCallSession(orgId, 'browser')
    res.json({ sessionId })
  } catch (err) {
    logger.error({ err }, '[Calls] Failed to create session')
    res.status(500).json({ error: 'Failed to create call session' })
  }
})

// ─── POST /api/calls/session/:id/end — end a call session ────────────────────
callsRouter.post('/session/:id/end', async (req, res) => {
  try {
    const { orgId } = getAuth(req)
    if (!orgId) return res.status(403).json({ error: 'Organization required' })

    await endCallSession(req.params.id)
    res.json({ ok: true })
  } catch (err) {
    logger.error({ err }, '[Calls] Failed to end session')
    res.status(500).json({ error: 'Failed to end call session' })
  }
})

// ─── GET /api/calls — list call sessions for org ─────────────────────────────
callsRouter.get('/', async (req, res) => {
  try {
    const { orgId } = getAuth(req)
    if (!orgId) return res.status(403).json({ error: 'Organization required' })

    const sessions = await CallSession.find({ organizationId: orgId })
      .sort({ createdAt: -1 })
      .limit(50)
      .select('-messages')  // exclude messages array from list view

    res.json({ sessions })
  } catch (err) {
    logger.error({ err }, '[Calls] Failed to list sessions')
    res.status(500).json({ error: 'Failed to list call sessions' })
  }
})

// ─── GET /api/calls/:id — get single session with full transcript ─────────────
callsRouter.get('/:id', async (req, res) => {
  try {
    const { orgId } = getAuth(req)
    if (!orgId) return res.status(403).json({ error: 'Organization required' })

    const session = await CallSession.findOne({
      sessionId: req.params.id,
      organizationId: orgId,
    })
    if (!session) return res.status(404).json({ error: 'Session not found' })

    res.json({ session })
  } catch (err) {
    logger.error({ err }, '[Calls] Failed to get session')
    res.status(500).json({ error: 'Failed to get call session' })
  }
})

// ─── DELETE /api/calls/:id ────────────────────────────────────────────────────
callsRouter.delete('/:id', async (req, res) => {
  try {
    const { orgId } = getAuth(req)
    if (!orgId) return res.status(403).json({ error: 'Organization required' })

    await CallSession.deleteOne({ sessionId: req.params.id, organizationId: orgId })
    res.json({ ok: true })
  } catch (err) {
    logger.error({ err }, '[Calls] Failed to delete session')
    res.status(500).json({ error: 'Failed to delete call session' })
  }
})
