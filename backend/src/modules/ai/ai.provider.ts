/** Options for any AI completion call */
export interface CompletionOptions {
  maxTokens?: number
  temperature?: number      // 0 = deterministic, 1 = creative
  systemPrompt?: string
}

/** Common interface all providers implement */
export interface AIProvider {
  readonly name: string
  complete(prompt: string, opts?: CompletionOptions): Promise<string>
}
