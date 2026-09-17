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
    type: { type: String, enum: ['key-value', 'text', 'url', 'pdf'], default: 'key-value' },
    category: {
      type: String,
      required: true,
      enum: ['services', 'pricing', 'faq', 'hours', 'policies', 'locations', 'products', 'other', 'document'],
    },
    // For 'key-value' type
    key:   { type: String },   
    value: { type: String },   
    // For 'text', 'url', 'pdf' types
    title: { type: String },
    content: { type: String }, // the extracted text content
    metadata: { type: Schema.Types.Mixed }, // e.g. source url, file path, chunk index
    isActive: { type: Boolean, default: true },
    createdBy: { type: String, required: true },
  },
  { timestamps: true },
)

kbSchema.index({ organizationId: 1, category: 1 })
kbSchema.index({ organizationId: 1, isActive: 1 })

export const KBModel = models.BusinessOSKB || model('BusinessOSKB', kbSchema)
