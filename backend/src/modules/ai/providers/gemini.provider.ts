import { GoogleGenerativeAI } from '@google/generative-ai'
import { KeyPool } from '../key-pool.js'
import type { AIProvider, CompletionOptions } from '../ai.provider.js'

/**
 * Gemini models — updated list (gemini-2.0-flash deprecated Sept 2026).
 */
const MODELS = [
  'gemini-1.5-flash-latest',           // Most stable free model — use this first
  'gemini-3.6-flash',           // Newer naming (as of Sept 2026)
  'gemini-2.5-flash-preview-04-17', // Experimental
  'gemini-1.5-flash-8b',        // Smallest — ultra-fast fallback
]

export class GeminiProvider implements AIProvider {
  readonly name = 'gemini'
  private pool: KeyPool

  constructor(keysStr: string) {
    this.pool = new KeyPool(keysStr)
  }

  async complete(prompt: string, opts?: CompletionOptions): Promise<string> {
    let lastError: Error = new Error('No keys available')

    for (let attempt = 0; attempt < this.pool.size; attempt++) {
      try {
        const apiKey = this.pool.next()
        const genAI = new GoogleGenerativeAI(apiKey)
        const model = genAI.getGenerativeModel({
          model: MODELS[0],
          ...(opts?.systemPrompt && {
            systemInstruction: opts.systemPrompt,
          }),
          generationConfig: {
            maxOutputTokens: opts?.maxTokens ?? 1024,
            temperature: opts?.temperature ?? 0.3,
          },
        })

        const result = await model.generateContent(prompt)
        return result.response.text()
      } catch (err) {
        lastError = err as Error
        const status = (err as { status?: number }).status
        if (status === 429 || status === 404) continue
        throw err
      }
    }

    throw lastError
  }
}
