import mongoose, { Schema } from 'mongoose'
const { model, models } = mongoose

const customerSchema = new Schema(
  {
    organizationId: { type: String, required: true, immutable: true },
    name:           { type: String, required: true },
    email:          { type: String, default: '' },
    phone:          { type: String, default: '' },
    company:        { type: String, default: '' },
    industry:       { type: String, default: '' },
    totalSpend:     { type: Number, min: 0, default: 0 },
    status: {
      type: String,
      enum: ['active', 'inactive', 'churned'],
      default: 'active',
    },
    tags:           { type: [String], default: [] },
    notes:          { type: String, default: '' },
    assignedTo:     { type: String, default: '' },      // userId
    convertedFromLead: { type: String, default: '' },   // Lead _id
    createdBy:      { type: String, required: true },
  },
  { timestamps: true },
)

// Indexes
customerSchema.index({ organizationId: 1, createdAt: -1 })
customerSchema.index({ organizationId: 1, status: 1 })
customerSchema.index({ organizationId: 1, email: 1 })

export const CustomerModel =
  models.BusinessOSCustomer || model('BusinessOSCustomer', customerSchema)
