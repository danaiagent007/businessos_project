import { Router, Request, Response } from 'express'
import { kbService } from '../kb/kb.service.js'
import { CallSession } from './call.model.js'
import { logger } from '../../common/logger.js'
import { v4 as uuidv4 } from 'uuid'

export const retellRouter = Router()

// ─── Helper: stream SSE response to Retell ───────────────────────────────────

function streamRetellResponse(res: Response, responseId: number, text: string): void {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  // Stream word-by-word for natural feel
  const words = text.split(' ')
  for (let i = 0; i < words.length; i++) {
    const chunk = i === 0 ? words[i] : ' ' + words[i]
    const isLast = i === words.length - 1
    res.write(`data: ${JSON.stringify({
      response_id: responseId,
      content: chunk,
      content_complete: isLast,
      end_call: false,
    })}\n\n`)
  }
  res.end()
}

// ─── POST /api/retell/llm — Custom LLM endpoint called by Retell ─────────────
// This is the core integration: Retell sends conversation → we return AI reply.
// No auth needed here (Retell doesn't send Clerk tokens).
// We verify using x-retell-signature or orgId from metadata.
retellRouter.post('/llm', async (req: Request, res: Response) => {
  try {
    const body = req.body as {
      call: {
        call_id: string
        agent_id: string
        metadata?: { orgId?: string }
      }
      response_id: number
      messages: Array<{ role: string; content: string }>
    }

    const { call, response_id, messages } = body
    const orgId = (req.query?.orgId as string) || call?.metadata?.orgId || process.env.DEFAULT_ORG_ID || ''
    const callId = call?.call_id || uuidv4()

    logger.info({ callId, orgId, response_id }, '[Retell] LLM request received')

    // Extract last user message
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content || ''
    logger.info({ callId, lastUserMsg }, '[Retell] User said')

    if (!lastUserMsg.trim()) {
      return streamRetellResponse(res, response_id,
        "I'm here! How can I help you today?")
    }

    // Build KB context for this org
    let kbContext = ''
    if (orgId) {
      try {
        kbContext = await kbService(orgId).buildContext()
      } catch (e) {
        logger.warn({ e }, '[Retell] KB fetch failed, continuing without KB')
      }
    }

    // Build system prompt with KB
    const systemPrompt = buildSystemPrompt(kbContext)

    // Call Groq LLM with streaming
    const groqKey = (process.env.GROQ_API_KEYS || '').split(',')[0].trim()
    if (!groqKey) {
      return streamRetellResponse(res, response_id,
        "I'm sorry, I'm having trouble right now. Please try again shortly.")
    }

    // Build messages for Groq
    const groqMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.filter(m => m.role === 'user' || m.role === 'assistant').slice(-10), // last 10 turns
    ]

    // Call Groq with streaming
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: groqMessages,
        max_tokens: 120,     // keep replies short for voice
        temperature: 0.5,
        stream: false,       // collect full response then stream to Retell word-by-word
      }),
    })

    if (!groqRes.ok) {
      const err = await groqRes.text()
      logger.error({ err }, '[Retell] Groq error')
      return streamRetellResponse(res, response_id,
        "I apologize, I'm having a technical issue. Please try again.")
    }

    const groqData = await groqRes.json() as {
      choices: Array<{ message: { content: string } }>
    }
    const aiReply = groqData.choices?.[0]?.message?.content?.trim() || 
      "I'm not sure about that. Can you please repeat?"

    logger.info({ callId, aiReply }, '[Retell] AI reply')

    // Save to CallSession (async, don't await)
    saveRetellTurn(callId, orgId, lastUserMsg, aiReply).catch(e =>
      logger.warn({ e }, '[Retell] Failed to save turn')
    )

    // Stream reply to Retell
    streamRetellResponse(res, response_id, aiReply)

  } catch (err) {
    logger.error({ err }, '[Retell] LLM endpoint error')
    if (!res.headersSent) {
      streamRetellResponse(res, 0, 
        "I'm sorry, something went wrong. Please try again.")
    }
  }
})

// ─── POST /api/retell/webhook — Call lifecycle events ────────────────────────
retellRouter.post('/webhook', async (req: Request, res: Response) => {
  try {
    const { event, call } = req.body as {
      event: 'call_started' | 'call_ended' | 'call_analyzed'
      call: {
        call_id: string
        agent_id: string
        from_number?: string
        to_number?: string
        transcript?: string
        call_analysis?: {
          call_summary?: string
          user_sentiment?: string
          call_successful?: boolean
          in_voicemail?: boolean
          custom_analysis_data?: Record<string, unknown>
        }
        metadata?: { orgId?: string }
        start_timestamp?: number
        end_timestamp?: number
      }
    }

    const orgId = call?.metadata?.orgId || process.env.DEFAULT_ORG_ID || ''
    logger.info({ event, callId: call?.call_id, orgId }, '[Retell] Webhook received')

    if (event === 'call_started') {
      // Create CallSession record
      await CallSession.findOneAndUpdate(
        { sessionId: call.call_id },
        {
          $setOnInsert: {
            sessionId: call.call_id,
            organizationId: orgId,
            channel: 'twilio',
            phoneNumber: call.from_number,
            status: 'active',
            messages: [],
            transcript: '',
            durationSeconds: 0,
          }
        },
        { upsert: true, new: true }
      )
    }

    if (event === 'call_ended' || event === 'call_analyzed') {
      const duration = call.start_timestamp && call.end_timestamp
        ? Math.round((call.end_timestamp - call.start_timestamp) / 1000)
        : 0

      await CallSession.findOneAndUpdate(
        { sessionId: call.call_id },
        {
          $set: {
            status: 'ended',
            transcript: call.transcript || '',
            summary: call.call_analysis?.call_summary || '',
            intent: call.call_analysis?.user_sentiment || '',
            durationSeconds: duration,
          }
        }
      )
      logger.info({ callId: call.call_id, duration }, '[Retell] Call ended and saved')
    }

    res.json({ received: true })
  } catch (err) {
    logger.error({ err }, '[Retell] Webhook error')
    res.json({ received: true }) // always 200 to Retell
  }
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildSystemPrompt(kbContext: string): string {
  const kb = kbContext
    ? `\n\nBusiness Knowledge Base:\n${kbContext}`
    : ''

  return `You are a friendly AI voice assistant for a business. You are on a phone call.
  
Rules:
- Keep responses SHORT (1-2 sentences max) — this is a VOICE call, not text
- Be warm, natural, conversational — avoid bullet points or lists
- If asked about prices/services, use the knowledge base below
- If you don't know something, say "Let me connect you with our team"
- Never make up prices or services
- Speak naturally as if you're a helpful receptionist${kb}`
}

async function saveRetellTurn(
  callId: string,
  orgId: string,
  userText: string,
  aiText: string
): Promise<void> {
  await CallSession.findOneAndUpdate(
    { sessionId: callId },
    {
      $push: {
        messages: [
          { role: 'user', text: userText, timestamp: new Date() },
          { role: 'assistant', text: aiText, timestamp: new Date() },
        ],
      },
      $setOnInsert: {
        organizationId: orgId,
        channel: 'twilio',
        status: 'active',
        transcript: '',
        durationSeconds: 0,
      }
    },
    { upsert: true }
  )
}
