import mongoose, { Schema } from 'mongoose'
const { model, models } = mongoose

/**
 * Message — individual message in a conversation.
 */
const messageSchema = new Schema(
  {
    conversationId: { type: String, required: true },
    organizationId: { type: String, required: true, immutable: true },
    direction: {
      type: String,
      enum: ['inbound', 'outbound'],
      required: true,
    },
    content:      { type: String, required: true },
    waMessageId:  { type: String, default: '' },   // WhatsApp message ID (for dedup)
    intent:       { type: String, default: '' },   // AI-classified intent
    aiDraft:      { type: String, default: '' },   // AI-suggested reply (for pending)
    status: {
      type: String,
      enum: ['received', 'sent', 'delivered', 'read', 'pending_approval', 'rejected'],
      default: 'received',
    },
    sentBy:       { type: String, default: '' },   // userId (for outbound human messages)
    approvedBy:   { type: String, default: '' },   // userId who approved AI reply
    isAutoReply:  { type: Boolean, default: false },
    timestamp:    { type: Date, default: Date.now },
  },
  { timestamps: true },
)

messageSchema.index({ conversationId: 1, timestamp: 1 })
messageSchema.index({ organizationId: 1, status: 1 })
messageSchema.index({ waMessageId: 1 }, { unique: true, sparse: true })

export const MessageModel = models.BusinessOSMessage || model('BusinessOSMessage', messageSchema)
