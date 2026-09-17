import { Router, type Request, type Response } from 'express'
import { ConversationModel } from './conversation.model.js'
import { MessageModel } from './message.model.js'
import { whatsappClient } from '../whatsapp/whatsapp.client.js'
import { mustHaveOrg, requireRole, CRM_READ_ROLES, CRM_WRITE_ROLES } from '../../common/middleware/auth.js'
import { rateLimit } from '../../common/middleware/ratelimit.js'
import { logger } from '../../common/logger.js'

export const conversationsRouter = Router()

function handleError(res: Response, error: unknown) {
  const err = error as Error & { status?: number }
  res.status(err.status || 503).json({ error: err.message || 'Unexpected error.' })
}

// GET /api/conversations — list all conversations for org
conversationsRouter.get('/', mustHaveOrg, requireRole(...CRM_READ_ROLES), rateLimit('read'), async (req: Request, res: Response) => {
  try {
    const convs = await ConversationModel.find({ organizationId: req.tenant!.orgId })
      .sort({ lastMessageAt: -1 })
      .limit(100)
      .lean()
    res.json({ conversations: convs })
  } catch (error) { handleError(res, error) }
})

// GET /api/conversations/:id/messages — messages in a conversation
conversationsRouter.get('/:id/messages', mustHaveOrg, requireRole(...CRM_READ_ROLES), rateLimit('read'), async (req: Request, res: Response) => {
  try {
    const conv = await ConversationModel.findOne({ _id: req.params.id, organizationId: req.tenant!.orgId })
    if (!conv) { res.status(404).json({ error: 'Conversation not found' }); return }

    const messages = await MessageModel.find({ conversationId: req.params.id })
      .sort({ timestamp: 1 })
      .limit(200)
      .lean()

    // Mark as read — reset unread count
    await ConversationModel.findByIdAndUpdate(req.params.id, { unreadCount: 0 })

    res.json({ conversation: conv, messages })
  } catch (error) { handleError(res, error) }
})

// POST /api/conversations/:id/send — human sends a message
conversationsRouter.post('/:id/send', mustHaveOrg, requireRole(...CRM_WRITE_ROLES), rateLimit('write'), async (req: Request, res: Response) => {
  try {
    const { content } = req.body
    if (!content?.trim()) { res.status(400).json({ error: 'content is required' }); return }

    const conv = await ConversationModel.findOne({ _id: req.params.id, organizationId: req.tenant!.orgId })
    if (!conv) { res.status(404).json({ error: 'Conversation not found' }); return }

    // Send via WhatsApp API
    const { messageId } = await whatsappClient.sendText(conv.contactWaId || conv.contactPhone.replace('+', ''), content)

    const msg = await MessageModel.create({
      conversationId: req.params.id,
      organizationId: req.tenant!.orgId,
      direction: 'outbound',
      content: content.trim(),
      waMessageId: messageId,
      status: 'sent',
      sentBy: req.tenant!.userId,
      isAutoReply: false,
    })

    await ConversationModel.findByIdAndUpdate(req.params.id, {
      lastMessage: `You: ${content.slice(0, 80)}`,
      lastMessageAt: new Date(),
      status: 'open',
    })

    res.json({ message: msg })
  } catch (error) { handleError(res, error) }
})

// POST /api/conversations/:msgId/approve — approve AI draft
conversationsRouter.post('/messages/:msgId/approve', mustHaveOrg, requireRole(...CRM_WRITE_ROLES), rateLimit('write'), async (req: Request, res: Response) => {
  try {
    const msg = await MessageModel.findOne({ _id: req.params.msgId, organizationId: req.tenant!.orgId })
    if (!msg || msg.status !== 'pending_approval') { res.status(404).json({ error: 'Pending message not found' }); return }

    const textToSend = req.body?.content || msg.aiDraft
    if (!textToSend) { res.status(400).json({ error: 'No content to send' }); return }

    const conv = await ConversationModel.findById(msg.conversationId)
    if (!conv) { res.status(404).json({ error: 'Conversation not found' }); return }

    // Send approved reply
    const { messageId: sentId } = await whatsappClient.sendText(
      conv.contactWaId || conv.contactPhone.replace('+', ''),
      textToSend,
    )

    // Update original pending message
    await MessageModel.findByIdAndUpdate(req.params.msgId, {
      status: 'sent',
      content: textToSend,   // might have been edited
      waMessageId: sentId,
      approvedBy: req.tenant!.userId,
      isAutoReply: false,
    })

    await ConversationModel.findByIdAndUpdate(conv._id, {
      status: 'open',
      lastMessage: `You: ${textToSend.slice(0, 80)}`,
      lastMessageAt: new Date(),
    })

    logger.info({ msgId: req.params.msgId, approvedBy: req.tenant!.userId }, '[WA] AI draft approved and sent')
    res.json({ ok: true })
  } catch (error) { handleError(res, error) }
})

// POST /api/conversations/messages/:msgId/reject — reject AI draft
conversationsRouter.post('/messages/:msgId/reject', mustHaveOrg, requireRole(...CRM_WRITE_ROLES), rateLimit('write'), async (req: Request, res: Response) => {
  try {
    await MessageModel.findOneAndUpdate(
      { _id: req.params.msgId, organizationId: req.tenant!.orgId },
      { status: 'rejected' },
    )
    res.json({ ok: true })
  } catch (error) { handleError(res, error) }
})
