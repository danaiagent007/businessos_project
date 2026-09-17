import type { AIProvider } from './ai.provider.js'
import { GroqProvider } from './providers/groq.provider.js'
import { GeminiProvider } from './providers/gemini.provider.js'
import { logger } from '../../common/logger.js'

// ─── Provider pool (Groq primary → Gemini fallback) ──────────────────────────

const providers: AIProvider[] = []

if (process.env.GROQ_API_KEYS) {
  providers.push(new GroqProvider(process.env.GROQ_API_KEYS))
  logger.info(`[AI] Groq provider ready`)
}
if (process.env.GEMINI_API_KEYS) {
  providers.push(new GeminiProvider(process.env.GEMINI_API_KEYS))
  logger.info(`[AI] Gemini provider ready`)
}
if (providers.length === 0) {
  logger.warn('[AI] No AI providers configured — AI features disabled')
}

// ─── AI Service ───────────────────────────────────────────────────────────────

export interface LeadClassification {
  score: number   // 0-100
  intent: string  // e.g. "ready_to_buy", "exploring", "high_value", "not_interested"
}

/**
 * Try each provider in order; fall back to next on failure.
 */
async function complete(prompt: string, opts?: {
  maxTokens?: number
  temperature?: number
  systemPrompt?: string
}): Promise<string> {
  for (const provider of providers) {
    try {
      return await provider.complete(prompt, opts)
    } catch (err) {
      logger.warn({ provider: provider.name, err }, '[AI] Provider failed, trying next')
    }
  }
  throw new Error('[AI] All providers failed')
}

/**
 * Score a lead 0–100 and detect purchase intent.
 * Runs async (fire-and-forget from lead creation handler).
 */
export async function classifyLead(lead: {
  name: string
  source: string
  status: string
  notes: string
  estimatedValue: number
  company?: string
}): Promise<LeadClassification> {
  const prompt = `You are a CRM AI assistant that scores B2B/B2C sales leads for small businesses.

Analyze the following lead data and return a JSON object with:
- score: integer 0-100 (100 = extremely hot, ready to buy now; 0 = completely cold)
- intent: one of ["ready_to_buy","high_value","warm","exploring","low_priority","not_interested"]

Scoring guidelines:
- High estimated value (>5000) → +20 points
- Source "website" or "whatsapp" → +10 points (active inquiry)
- Status "qualified" → +20, "contacted" → +10
- Detailed notes with specific needs → +10
- No notes or "just browsing" → -15

Lead:
${JSON.stringify(lead, null, 2)}

IMPORTANT: Respond with ONLY valid JSON. No markdown, no explanation.
Example: {"score": 78, "intent": "high_value"}`

  const raw = await complete(prompt, { maxTokens: 80, temperature: 0.1 })

  // Extract JSON even if model adds extra text
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) throw new Error(`Invalid AI response: ${raw}`)
  const parsed = JSON.parse(match[0])

  return {
    score: Math.max(0, Math.min(100, Math.round(Number(parsed.score)))),
    intent: String(parsed.intent || 'exploring'),
  }
}

/**
 * Generate a WhatsApp or Email follow-up draft for a lead.
 * style: 'whatsapp' = short, friendly, emojis | 'email' = formal with subject line
 * kbContext: formatted business knowledge string from kb.service.buildContext()
 */
export async function generateFollowup(
  lead: { name: string; company: string; status: string; notes: string },
  style: 'whatsapp' | 'email' | string = 'whatsapp',
  kbContext = '',
): Promise<string> {
  const isEmail = style === 'email'
  const kb = kbContext ? `\n\nBusiness info you can reference:\n${kbContext}` : ''

  const prompt = isEmail
    ? `Write a professional follow-up email for this sales lead.${kb}

Format:
Subject: <subject line>

<email body — 3-4 sentences max. Reference their specific situation and relevant business info. Sign off with "Best regards, [Your Name]">

Lead info: ${JSON.stringify(lead)}

Return ONLY the formatted email text.`
    : `Write a short, warm WhatsApp follow-up message (max 60 words) for this sales lead.${kb}
Use natural language, a friendly emoji or two. Reference their specific situation and mention relevant info from the business knowledge if applicable.
Do NOT use bullet points or formal greetings.

Lead info: ${JSON.stringify(lead)}

Return ONLY the message text.`

  return complete(prompt, {
    maxTokens: isEmail ? 250 : 150,
    temperature: 0.7,
    systemPrompt: 'You are a friendly, skilled sales professional who writes personalized outreach messages.',
  })
}

/**
 * Summarize a list of conversation messages into a 2-3 sentence CRM note.
 */
export async function summarizeConversation(messages: string[]): Promise<string> {
  return complete(
    `Summarize this customer conversation in 2–3 sentences for a CRM note.
Focus on: customer need, interest level, agreed next step.

Messages:
${messages.join('\n---\n')}

Return ONLY the summary.`,
    { maxTokens: 200, temperature: 0.2 },
  )
}

/**
 * Detect customer intent from a single message (for inbox/chat triage).
 */
export async function detectIntent(message: string): Promise<string> {
  const result = await complete(
    `Classify this customer message into exactly one intent label.
Options: ready_to_buy | wants_info | price_inquiry | complaint | not_interested | general_inquiry

Message: "${message}"

Return ONLY the intent label.`,
    { maxTokens: 20, temperature: 0 },
  )
  return result.trim().toLowerCase().replace(/[^a-z_]/g, '')
}

/**
 * Answer an incoming customer WhatsApp message using business knowledge.
 * Used by the WhatsApp auto-reply pipeline.
 */
export async function answerCustomerMessage(message: string, kbContext = ''): Promise<string> {
  const kb = kbContext
    ? `\n\nBusiness Knowledge Base:\n${kbContext}`
    : ''

  return complete(
    `You are a friendly AI assistant for a business. Answer the customer's message accurately and concisely (max 60 words).${kb}

Use ONLY the information from the Business Knowledge Base above.
If you don't have the specific information, say: "I'll connect you with our team for more details."
Never invent prices or services.
Be warm and natural — not robotic.

Customer message: "${message}"

Reply:`,
    {
      maxTokens: 160,
      temperature: 0.4,
      systemPrompt: 'You are a helpful, friendly business assistant. Only answer based on provided business knowledge.',
    },
  )
}

export const aiService = { classifyLead, generateFollowup, summarizeConversation, detectIntent, answerCustomerMessage }
