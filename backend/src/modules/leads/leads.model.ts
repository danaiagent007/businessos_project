import mongoose, { Schema } from 'mongoose'
const { model, models } = mongoose

const leadSchema = new Schema(
  {
    organizationId: { type: String, required: true, immutable: true },
    name: { type: String, required: true },
    email: { type: String, default: '' },
    company: { type: String, default: '' },
    estimatedValue: { type: Number, min: 0, default: 0 },
    source: {
      type: String,
      enum: ['manual', 'website', 'whatsapp', 'instagram'],
      default: 'manual',
    },
    status: {
      type: String,
      enum: ['new', 'contacted', 'qualified', 'won', 'lost'],
      default: 'new',
    },
    nextFollowupAt: { type: String, default: '' },
    notes: { type: String, default: '' },
    score: { type: Number, min: 0, max: 100, default: 0 },   // AI-generated
    intent: { type: String, default: '' },                     // AI-generated
    lastContactAt: { type: String, default: '' },
    assignedTo: { type: String, default: '' },                 // userId
    createdBy: { type: String, required: true },
  },
  { timestamps: true },
)

// Indexes: always filter by orgId first
leadSchema.index({ organizationId: 1, createdAt: -1 })
leadSchema.index({ organizationId: 1, status: 1 })
leadSchema.index({ organizationId: 1, nextFollowupAt: 1 })

export const LeadModel = models.BusinessOSLead || model('BusinessOSLead', leadSchema)
