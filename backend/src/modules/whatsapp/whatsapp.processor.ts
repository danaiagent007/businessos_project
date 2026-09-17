import { ConversationModel } from '../conversations/conversation.model.js'
import { MessageModel } from '../conversations/message.model.js'
import { aiService } from '../ai/ai.service.js'
import { kbService } from '../kb/kb.service.js'
import { whatsappClient } from './whatsapp.client.js'
import { logger } from '../../common/logger.js'

// ─── Rules engine ──────────────────────────────────────────────────────────────
// Returns true if the AI should auto-reply, false = human approval needed
function shouldAutoReply(intent: string, message: string): boolean {
  const msg = message.toLowerCase()

  // Always require human approval for:
  const needsHuman = [
    'discount', 'refund', 'complaint', 'angry', 'legal', 'lawsuit',
    'terrible', 'scam', 'fraud', 'cancel my', 'cancellation',
  ]
  if (needsHuman.some((w) => msg.includes(w))) return false

  // Auto-reply for informational intents
  const autoIntents = ['price_inquiry', 'wants_info', 'general_inquiry']
  return autoIntents.includes(intent)
}

// ─── Core processor ────────────────────────────────────────────────────────────
export async function processIncomingMessage(orgId: string, payload: {
  waId: string         // e.g. "919876543210"
  phone: string        // E.164 e.g. "+919876543210"
  name: string
  content: string
  waMessageId: string
  timestamp: number
}): Promise<void> {
  const { waId, phone, name, content, waMessageId, timestamp } = payload

  // 1. Dedup — skip if already processed
  const existing = await MessageModel.findOne({ waMessageId })
  if (existing) {
    logger.info({ waMessageId }, '[WA] Duplicate message, skipping')
    return
  }

  // 2. Find or create conversation
  let conv = await ConversationModel.findOne({ organizationId: orgId, contactPhone: phone })
  if (!conv) {
    conv = await ConversationModel.create({
      organizationId: orgId,
      contactPhone: phone,
      contactName: name || phone,
      contactWaId: waId,
      status: 'open',
    })
  } else {
    conv.contactName = name || conv.contactName
    conv.unreadCount = (conv.unreadCount || 0) + 1
    conv.lastMessage = content.slice(0, 100)
    conv.lastMessageAt = new Date(timestamp * 1000)
    await conv.save()
  }

  // 3. Save inbound message
  const inboundMsg = await MessageModel.create({
    conversationId: String(conv._id),
    organizationId: orgId,
    direction: 'inbound',
    content,
    waMessageId,
    status: 'received',
    timestamp: new Date(timestamp * 1000),
  })

  logger.info({ convId: conv._id, phone, content: content.slice(0, 60) }, '[WA] Inbound message saved')

  // 4. Mark as read (non-critical)
  whatsappClient.markRead(waMessageId).catch(() => {})

  // 5. Classify intent
  let intent = 'general_inquiry'
  try {
    intent = await aiService.detectIntent(content)
    await MessageModel.findByIdAndUpdate(inboundMsg._id, { intent })
  } catch (err) {
    logger.warn({ err }, '[WA] Intent detection failed')
  }

  // 6. Rules engine — decide mode
  const auto = shouldAutoReply(intent, content)
  logger.info({ intent, auto }, '[WA] Mode decision')

  // 7. Generate AI reply using KB context
  let aiDraft = ''
  try {
    const kbContext = await kbService(orgId).buildContext()
    aiDraft = await aiService.answerCustomerMessage(content, kbContext)
  } catch (err) {
    logger.warn({ err }, '[WA] AI draft generation failed')
    aiDraft = 'Thank you for your message! Our team will get back to you shortly.'
  }

  if (auto && aiDraft) {
    // 8a. Auto-reply: send immediately
    try {
      const { messageId } = await whatsappClient.sendText(waId, aiDraft)
      await MessageModel.create({
        conversationId: String(conv._id),
        organizationId: orgId,
        direction: 'outbound',
        content: aiDraft,
        waMessageId: messageId,
        status: 'sent',
        isAutoReply: true,
      })
      await ConversationModel.findByIdAndUpdate(conv._id, {
        status: 'open',
        lastMessage: `You: ${aiDraft.slice(0, 80)}`,
        lastMessageAt: new Date(),
        unreadCount: 0,
      })
      logger.info({ phone }, '[WA] Auto-reply sent')
    } catch (err) {
      logger.error({ err }, '[WA] Failed to send auto-reply — saving as pending instead')
      // Fall through to pending
      await MessageModel.findByIdAndUpdate(inboundMsg._id, { aiDraft, status: 'pending_approval' })
      await ConversationModel.findByIdAndUpdate(conv._id, { status: 'pending_reply' })
    }
  } else {
    // 8b. Human approval: save draft and mark conversation
    await MessageModel.findByIdAndUpdate(inboundMsg._id, { aiDraft, status: 'pending_approval' })
    await ConversationModel.findByIdAndUpdate(conv._id, {
      status: 'pending_reply',
      lastMessage: content.slice(0, 100),
    })
    logger.info({ phone, intent }, '[WA] Pending human approval')
  }
}
