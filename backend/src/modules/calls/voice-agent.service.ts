import { v4 as uuidv4 } from 'uuid'
import { speechToText, textToSpeech } from './sarvam.service.js'
import { aiService } from '../ai/ai.service.js'
import { kbService } from '../kb/kb.service.js'
import { CallSession } from './call.model.js'
import { logger } from '../../common/logger.js'

export interface VoiceTurn {
  userText: string
  aiText: string
  language: string
  audioBuffer: Buffer
}

/**
 * Process one voice turn:
 *  1. STT  — audio → user text
 *  2. LLM  — user text + KB context → AI reply text
 *  3. TTS  — AI reply text → audio buffer
 *  4. Save turn to session
 */
export async function processVoiceTurn(
  sessionId: string,
  organizationId: string,
  audioBuffer: Buffer,
  mimeType = 'audio/wav'
): Promise<VoiceTurn> {

  // ── 1. Speech → Text ──────────────────────────────────────────────────────
  logger.info({ sessionId }, '[Voice] STT start')
  const sttResult = await speechToText(audioBuffer, mimeType, 'unknown')
  const userText = sttResult.transcript?.trim() || ''
  const language = sttResult.language_code || 'en-IN'
  logger.info({ sessionId, userText, language }, '[Voice] STT done')

  if (!userText) {
    throw new Error('Could not understand audio. Please speak clearly.')
  }

  // ── 2. LLM — build reply with KB context ─────────────────────────────────
  const kbContext = await kbService(organizationId).buildContext()
  const aiText = await aiService.answerCustomerMessage(userText, kbContext)
  logger.info({ sessionId, aiText }, '[Voice] LLM reply ready')

  // ── 3. Text → Speech ──────────────────────────────────────────────────────
  const ttsResult = await textToSpeech(aiText, language)
  logger.info({ sessionId, bytes: ttsResult.audioBuffer.length }, '[Voice] TTS done')

  // ── 4. Persist turn to CallSession ────────────────────────────────────────
  await CallSession.findOneAndUpdate(
    { sessionId },
    {
      $push: {
        messages: [
          { role: 'user',      text: userText, timestamp: new Date() },
          { role: 'assistant', text: aiText,   timestamp: new Date() },
        ],
      },
      $set: { language },
    }
  )

  return { userText, aiText, language, audioBuffer: ttsResult.audioBuffer }
}

/**
 * Create a new CallSession in MongoDB.
 */
export async function createCallSession(
  organizationId: string,
  channel: 'browser' | 'twilio' = 'browser',
  phoneNumber?: string
): Promise<string> {
  const sessionId = uuidv4()
  await CallSession.create({
    organizationId,
    sessionId,
    channel,
    phoneNumber,
    status: 'active',
    messages: [],
    transcript: '',
  })
  logger.info({ sessionId, organizationId }, '[Voice] Session created')
  return sessionId
}

/**
 * End a call session: generate summary + build transcript.
 */
export async function endCallSession(sessionId: string): Promise<void> {
  const session = await CallSession.findOne({ sessionId })
  if (!session) return

  const lines = session.messages.map(m =>
    `${m.role === 'user' ? 'Customer' : 'AI'}: ${m.text}`
  )
  const transcript = lines.join('\n')
  const summary = lines.length > 0
    ? await aiService.summarizeConversation(lines)
    : 'No conversation recorded.'

  const startTime = session.createdAt as Date
  const durationSeconds = Math.round((Date.now() - startTime.getTime()) / 1000)

  await CallSession.findOneAndUpdate(
    { sessionId },
    { $set: { status: 'ended', transcript, summary, durationSeconds } }
  )
  logger.info({ sessionId, durationSeconds }, '[Voice] Session ended')
}
