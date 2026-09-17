/**
 * Round-robin key pool for AI provider keys.
 * Cycles through all keys and retries with the next on 429 rate-limit errors.
 */
export class KeyPool {
  private readonly keys: string[]
  private index = 0

  constructor(keysStr: string) {
    this.keys = keysStr.split(',').map(k => k.trim()).filter(Boolean)
    if (this.keys.length === 0) throw new Error('KeyPool: no API keys provided')
  }

  /** Returns the next key in round-robin order */
  next(): string {
    const key = this.keys[this.index % this.keys.length]
    this.index = (this.index + 1) % this.keys.length
    return key
  }

  get size(): number {
    return this.keys.length
  }
}
