import mongoose, { Schema } from 'mongoose'
const { model, models } = mongoose

/**
 * BusinessKB — per-org knowledge base entries.
 * These are injected into AI prompts so the AI can answer questions
 * accurately using the business's real data (prices, services, FAQs, etc.)
 */
const kbSchema = new Schema(
  {
    organizationId: { type: String, required: true, immutable: true },
    category: {
      type: String,
      required: true,
      enum: ['services', 'pricing', 'faq', 'hours', 'policies', 'locations', 'products', 'other'],
    },
    key:   { type: String, required: true },   // e.g. "haircut+facial price"
    value: { type: String, required: true },   // e.g. "₹1,000 — 90 mins"
    isActive: { type: Boolean, default: true },
    createdBy: { type: String, required: true },
  },
  { timestamps: true },
)

kbSchema.index({ organizationId: 1, category: 1 })
kbSchema.index({ organizationId: 1, isActive: 1 })

export const KBModel = models.BusinessOSKB || model('BusinessOSKB', kbSchema)
