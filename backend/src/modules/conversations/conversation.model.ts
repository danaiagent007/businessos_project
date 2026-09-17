import mongoose, { Schema } from 'mongoose'
const { model, models } = mongoose

/**
 * Conversation — one per contact per channel per org.
 * A "thread" of messages with a customer.
 */
const conversationSchema = new Schema(
  {
    organizationId: { type: String, required: true, immutable: true },
    channel:        { type: String, enum: ['whatsapp', 'instagram', 'email'], default: 'whatsapp' },
    contactPhone:   { type: String, required: true },   // E.164 format e.g. +919876543210
    contactName:    { type: String, default: '' },
    contactWaId:    { type: String, default: '' },      // WhatsApp-assigned contact ID
    leadId:         { type: String, default: '' },      // linked CRM lead _id
    customerId:     { type: String, default: '' },      // linked customer _id
    status: {
      type: String,
      enum: ['open', 'pending_reply', 'resolved'],
      default: 'open',
    },
    lastMessage:    { type: String, default: '' },
    lastMessageAt:  { type: Date, default: Date.now },
    unreadCount:    { type: Number, default: 0 },
  },
  { timestamps: true },
)

conversationSchema.index({ organizationId: 1, lastMessageAt: -1 })
conversationSchema.index({ organizationId: 1, contactPhone: 1 }, { unique: true })
conversationSchema.index({ organizationId: 1, status: 1 })

export const ConversationModel =
  models.BusinessOSConversation || model('BusinessOSConversation', conversationSchema)
