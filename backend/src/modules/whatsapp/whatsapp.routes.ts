import { Router, type Request, type Response } from 'express'
import { processIncomingMessage } from './whatsapp.processor.js'
import { logger } from '../../common/logger.js'

export const webhookRouter = Router()

/**
 * GET /api/webhooks/whatsapp
 * Meta verification handshake — called once when you save the webhook URL in Meta dashboard.
 * Set WHATSAPP_VERIFY_TOKEN in .env to any secret string, then paste it in Meta dashboard.
 */
webhookRouter.get('/whatsapp', (req: Request, res: Response) => {
  const mode      = req.query['hub.mode']
  const token     = req.query['hub.verify_token']
  const challenge = req.query['hub.challenge']
  const expected  = process.env.WHATSAPP_VERIFY_TOKEN

  if (mode === 'subscribe' && token === expected) {
    logger.info('[WA] Webhook verified by Meta ✅')
    res.status(200).send(challenge)
  } else {
    logger.warn({ mode, token }, '[WA] Webhook verification failed')
    res.sendStatus(403)
  }
})

/**
 * POST /api/webhooks/whatsapp
 * Meta sends all incoming WhatsApp messages here.
 * We respond 200 immediately (Meta requires < 20s), then process async.
 */
webhookRouter.post('/whatsapp', (req: Request, res: Response) => {
  // Respond immediately so Meta doesn't retry
  res.sendStatus(200)

  const body = req.body
  if (body?.object !== 'whatsapp_business_account') return

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== 'messages') continue

      const orgId = process.env.DEFAULT_ORG_ID || ''  // For multi-tenant: derive from phone number ID mapping
      const value = change.value
      const messages = value?.messages ?? []
      const contacts = value?.contacts ?? []

      for (const msg of messages) {
        if (msg.type !== 'text') continue  // Skip image/audio for now

        const waId   = msg.from                              // e.g. "919876543210"
        const phone  = '+' + msg.from                        // e.g. "+919876543210"
        const name   = contacts.find((c: { wa_id: string; profile?: { name: string } }) => c.wa_id === msg.from)?.profile?.name || phone
        const content  = msg.text?.body || ''
        const waMessageId = msg.id
        const timestamp   = Number(msg.timestamp)

        if (!content || !orgId) {
          logger.warn({ phone, content: !!content, orgId: !!orgId }, '[WA] Skipping message — missing content or orgId')
          continue
        }

        // Process async — don't await, Meta already got 200
        setImmediate(() => {
          processIncomingMessage(orgId, { waId, phone, name, content, waMessageId, timestamp })
            .catch((err) => logger.error({ err }, '[WA] processIncomingMessage failed'))
        })
      }
    }
  }
})
