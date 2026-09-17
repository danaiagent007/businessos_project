/**
 * WhatsApp Cloud API client.
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api/messages
 *
 * Set these env vars:
 *   WHATSAPP_TOKEN           — Permanent token from Meta System User
 *   WHATSAPP_PHONE_NUMBER_ID — From Meta Developer → WhatsApp → API Setup
 */

const API_BASE = 'https://graph.facebook.com/v19.0'

function getConfig() {
  return {
    token:         process.env.WHATSAPP_TOKEN || '',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
  }
}

/**
 * Send a text message to a WhatsApp number.
 * @param to   — recipient in E.164 format e.g. "919876543210"
 * @param text — message text
 */
export async function sendText(to: string, text: string): Promise<{ messageId: string }> {
  const { token, phoneNumberId } = getConfig()

  if (!token || !phoneNumberId) {
    throw new Error('WHATSAPP_TOKEN or WHATSAPP_PHONE_NUMBER_ID not set in .env')
  }

  const res = await fetch(`${API_BASE}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: { preview_url: false, body: text },
    }),
  })

  const data = await res.json() as { messages?: { id: string }[]; error?: { message: string } }
  if (!res.ok) throw new Error(data.error?.message || `WhatsApp API error ${res.status}`)
  return { messageId: data.messages?.[0]?.id || '' }
}

/**
 * Mark a message as read.
 */
export async function markRead(waMessageId: string): Promise<void> {
  const { token, phoneNumberId } = getConfig()
  if (!token || !phoneNumberId) return

  await fetch(`${API_BASE}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', status: 'read', message_id: waMessageId }),
  }).catch(() => { /* non-critical */ })
}

export const whatsappClient = { sendText, markRead }
