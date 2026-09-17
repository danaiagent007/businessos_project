import './config/index.js'          // validate env vars first
import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { clerkMiddleware } from '@clerk/express'
import pinoHttp from 'pino-http'
import mongoose from 'mongoose'
import { config } from './config/index.js'
import { logger } from './common/logger.js'
import { tenantMiddleware } from './common/middleware/tenant.js'
import { errorHandler, notFound } from './common/middleware/error.js'
import { leadsRouter } from './modules/leads/leads.routes.js'
import { customersRouter } from './modules/customers/customers.routes.js'
import { kbRouter } from './modules/kb/kb.routes.js'
import { webhookRouter } from './modules/whatsapp/whatsapp.routes.js'
import { conversationsRouter } from './modules/conversations/conversations.routes.js'
import { callsRouter } from './modules/calls/calls.routes.js'
import { retellRouter } from './modules/calls/retell.routes.js'
import { attachVoiceWebSocket } from './modules/calls/call.ws.js'

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
app.use('/api/calls', callsRouter)
// Retell endpoints — NO Clerk auth (Retell calls them directly)
app.use('/api/retell', retellRouter)

// ─── 404 + Error handlers ────────────────────────────────────────────────────
app.use(notFound)
app.use(errorHandler)

// ─── Start ───────────────────────────────────────────────────────────────────
mongoose.connect(config.mongodb.uri).then(() => {
  logger.info('📦 Connected to MongoDB')
  attachVoiceWebSocket(httpServer)
  httpServer.listen(config.port, () => {
    logger.info(`🚀 Backend running on http://localhost:${config.port}`)
    logger.info(`   Environment: ${config.nodeEnv}`)
  })
}).catch((err) => {
  logger.error({ err }, 'Failed to connect to MongoDB')
  process.exit(1)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down...')
  httpServer.close(() => process.exit(0))
})
