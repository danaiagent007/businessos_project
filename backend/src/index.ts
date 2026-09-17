import './config/index.js'          // validate env vars first
import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { clerkMiddleware } from '@clerk/express'
import pinoHttp from 'pino-http'
import { config } from './config/index.js'
import { logger } from './common/logger.js'
import { tenantMiddleware } from './common/middleware/tenant.js'
import { errorHandler, notFound } from './common/middleware/error.js'
import { leadsRouter } from './modules/leads/leads.routes.js'
import { customersRouter } from './modules/customers/customers.routes.js'
import { kbRouter } from './modules/kb/kb.routes.js'
import { webhookRouter } from './modules/whatsapp/whatsapp.routes.js'
import { conversationsRouter } from './modules/conversations/conversations.routes.js'

// ─── App setup ────────────────────────────────────────────────────────────────
const app = express()
const httpServer = createServer(app)

// ─── Global middleware ────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
app.use((pinoHttp as any)({ logger }))
app.use(cors({
  origin: config.cors.allowedOrigins,
  credentials: true,
}))
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true }))

// Clerk auth on every request — populates getAuth(req)
app.use(clerkMiddleware())

// Attach tenant context (orgId, userId, orgRole) to req.tenant
app.use(tenantMiddleware)

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() })
})

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/leads', leadsRouter)
app.use('/api/customers', customersRouter)
app.use('/api/kb', kbRouter)
app.use('/api/webhooks', webhookRouter)
app.use('/api/conversations', conversationsRouter)

// ─── 404 + Error handlers ────────────────────────────────────────────────────
app.use(notFound)
app.use(errorHandler)

// ─── Start ───────────────────────────────────────────────────────────────────
httpServer.listen(config.port, () => {
  logger.info(`🚀 Backend running on http://localhost:${config.port}`)
  logger.info(`   Environment: ${config.nodeEnv}`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down...')
  httpServer.close(() => process.exit(0))
})
