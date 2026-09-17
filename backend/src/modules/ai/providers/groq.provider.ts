import Groq from 'groq-sdk'
import { KeyPool } from '../key-pool.js'
import type { AIProvider, CompletionOptions } from '../ai.provider.js'

/**
 * Groq models ordered by quality — confirmed available on free tier.
 * Use standard model names from https://console.groq.com/docs/models
 */
const MODELS = [
  'openai/gpt-oss-120b',       // Working model for this API key
  'llama3-70b-8192',           // 70B — widely available on all keys
  'llama-3.3-70b-versatile',   // New 70B model
  'mixtral-8x7b-32768',        // 8×7B — 32k context
  'gemma2-9b-it',              // 9B — Google's model via Groq
  'llama3-8b-8192',            // 8B — stable fallback
]

export class GroqProvider implements AIProvider {
  readonly name = 'groq'
  private pool: KeyPool

  constructor(keysStr: string) {
    this.pool = new KeyPool(keysStr)
  }

  async complete(prompt: string, opts?: CompletionOptions): Promise<string> {
    let lastError: Error = new Error('No keys available')

    // Try each key in pool before failing
    for (let attempt = 0; attempt < this.pool.size; attempt++) {
      try {
        const apiKey = this.pool.next()
        const groq = new Groq({ apiKey })

        const messages: Groq.Chat.Completions.ChatCompletionMessageParam[] = []
        if (opts?.systemPrompt) {
          messages.push({ role: 'system', content: opts.systemPrompt })
        }
        messages.push({ role: 'user', content: prompt })

        const completion = await groq.chat.completions.create({
          model: MODELS[0],
          messages,
          max_tokens: opts?.maxTokens ?? 1024,
          temperature: opts?.temperature ?? 0.3,
        })

        return completion.choices[0]?.message?.content ?? ''
      } catch (err) {
        lastError = err as Error
        const status = (err as { status?: number }).status
        // Rotate on rate limit (429) or model not found (404) to try next key/model
        if (status === 429 || status === 404) continue
        throw err
      }
    }

    throw lastError
  }
}
