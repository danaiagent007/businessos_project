import mongoose, { Schema, Document } from 'mongoose'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ICallMessage {
  role: 'user' | 'assistant'
  text: string
  timestamp: Date
}

export interface ICallSession extends Document {
  organizationId: string
  sessionId: string           // unique UUID per call
  status: 'active' | 'ended'
  channel: 'browser' | 'twilio'
  phoneNumber?: string        // caller's number (if Twilio)
  language: string            // detected language code e.g. 'hi-IN'
  messages: ICallMessage[]
  transcript: string          // full conversation as plain text
  summary?: string            // AI-generated summary
  intent?: string             // primary intent detected
  outcome?: string            // e.g. 'lead_created', 'appointment_booked', 'info_given'
  durationSeconds: number
  createdAt: Date
  updatedAt: Date
}

// ─── Schema ──────────────────────────────────────────────────────────────────

const CallMessageSchema = new Schema<ICallMessage>({
  role: { type: String, enum: ['user', 'assistant'], required: true },
  text: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
})

const CallSessionSchema = new Schema<ICallSession>(
  {
    organizationId: { type: String, required: true, index: true },
    sessionId: { type: String, required: true, unique: true },
    status: { type: String, enum: ['active', 'ended'], default: 'active' },
    channel: { type: String, enum: ['browser', 'twilio'], default: 'browser' },
    phoneNumber: { type: String },
    language: { type: String, default: 'en-IN' },
    messages: [CallMessageSchema],
    transcript: { type: String, default: '' },
    summary: { type: String },
    intent: { type: String },
    outcome: { type: String },
    durationSeconds: { type: Number, default: 0 },
  },
  { timestamps: true }
)

export const CallSession = mongoose.model<ICallSession>('CallSession', CallSessionSchema)
