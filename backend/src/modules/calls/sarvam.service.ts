// Uses Node 18+ native fetch + FormData — no extra packages needed

const SARVAM_BASE = 'https://api.sarvam.ai'

function getKey(): string {
  const key = process.env.SARVAM_API_KEY
  if (!key) throw new Error('SARVAM_API_KEY not set')
  return key
}

// ─── Speech → Text ──────────────────────────────────────────────────────────

export interface STTResult {
  transcript: string
  language_code: string
}

/**
 * Convert audio buffer (wav/mp3/webm) to text using Sarvam Saarika v2.
 * @param audioBuffer  Raw audio bytes
 * @param mimeType     e.g. 'audio/wav', 'audio/webm', 'audio/mpeg'
 * @param languageCode 'unknown' for auto-detect, or 'hi-IN','te-IN','en-IN' etc.
 */
export async function speechToText(
  audioBuffer: Buffer,
  mimeType = 'audio/wav',
  languageCode = 'unknown'
): Promise<STTResult> {
  const ext = mimeType.split('/')[1]?.replace('webm', 'webm') || 'wav'
  const filename = `audio.${ext}`

  const form = new FormData()
  form.append('file', new Blob([audioBuffer], { type: mimeType }), filename)
  form.append('model', 'saaras:v3')
  form.append('language_code', languageCode)
  form.append('with_timestamps', 'false')

  const res = await fetch(`${SARVAM_BASE}/speech-to-text`, {
    method: 'POST',
    headers: {
      'api-subscription-key': getKey(),
      // Note: DO NOT set Content-Type manually — fetch sets multipart boundary automatically
    },
    body: form,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Sarvam STT error ${res.status}: ${text}`)
  }

  const data = await res.json() as { transcript: string; language_code: string }
  return { transcript: data.transcript, language_code: data.language_code }
}

// ─── Text → Speech ───────────────────────────────────────────────────────────

export type SarvamSpeaker =
  | 'anushka'   // Female, Indian English
  | 'manisha'   // Female, Hindi
  | 'vidya'     // Female, South Indian
  | 'arya'      // Female, neutral
  | 'abhilash'  // Male
  | 'karun'     // Male
  | 'hitesh'    // Male

export interface TTSResult {
  /** Base64-encoded WAV audio */
  audio_base64: string
  /** Raw audio Buffer (decoded from base64) */
  audioBuffer: Buffer
}

/**
 * Convert text to speech using Sarvam Bulbul v2.
 * Returns audio as a Buffer (WAV format, 22050 Hz).
 */
export async function textToSpeech(
  text: string,
  languageCode = 'en-IN',
  speaker: SarvamSpeaker = 'anushka'
): Promise<TTSResult> {
  const res = await fetch(`${SARVAM_BASE}/text-to-speech`, {
    method: 'POST',
    headers: {
      'api-subscription-key': getKey(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: [text],
      target_language_code: languageCode,
      speaker,
      model: 'bulbul:v2',
      enable_preprocessing: true,
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Sarvam TTS error ${res.status}: ${errText}`)
  }

  const data = await res.json() as { audios: string[] }
  const audio_base64 = data.audios?.[0] ?? ''
  const audioBuffer = Buffer.from(audio_base64, 'base64')
  return { audio_base64, audioBuffer }
}
