import { WebSocketServer, WebSocket } from 'ws'
import { IncomingMessage } from 'http'
import { Server } from 'http'
import { processVoiceTurn, endCallSession } from './voice-agent.service.js'
import { logger } from '../../common/logger.js'

interface VoiceClient {
  ws: WebSocket
  sessionId: string
  organizationId: string
  audioChunks: Buffer[]
}

const clients = new Map<WebSocket, VoiceClient>()

/**
 * Attach WebSocket server to the HTTP server.
 * Frontend connects to ws://host/ws/voice?sessionId=...&orgId=...
 */
export function attachVoiceWebSocket(httpServer: Server): void {
  const wss = new WebSocketServer({ noServer: true })

  httpServer.on('upgrade', (request: IncomingMessage, socket, head) => {
    const url = new URL(request.url || '', `http://${request.headers.host}`)
    if (url.pathname === '/ws/voice') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request)
      })
    }
  })

  wss.on('connection', async (ws: WebSocket, req: IncomingMessage) => {
    const url = new URL(req.url || '', 'http://localhost')
    const sessionId = url.searchParams.get('sessionId') || ''
    const organizationId = url.searchParams.get('orgId') || ''

    if (!sessionId || !organizationId) {
      ws.close(1008, 'Missing sessionId or orgId')
      return
    }

    logger.info({ sessionId }, '[VoiceWS] Client connected')

    const client: VoiceClient = { ws, sessionId, organizationId, audioChunks: [] }
    clients.set(ws, client)

    // Send ready signal
    ws.send(JSON.stringify({ type: 'ready', sessionId }))

    ws.on('message', async (data: Buffer | string) => {
      const client = clients.get(ws)
      if (!client) return

      // Detect message type: JSON control message or binary audio
      if (typeof data === 'string' || (data instanceof Buffer && data[0] === 123)) {
        // JSON control message
        try {
          const msg = JSON.parse(data.toString())
          if (msg.type === 'audio_end') {
            // User finished speaking — process the full audio turn
            await handleAudioTurn(client)
          } else if (msg.type === 'end_call') {
            await endCallSession(client.sessionId)
            ws.send(JSON.stringify({ type: 'call_ended' }))
            ws.close()
          }
        } catch (e) {
          logger.error({ e }, '[VoiceWS] Failed to parse control message')
        }
      } else if (data instanceof Buffer) {
        // Binary audio chunk — accumulate
        client.audioChunks.push(data)
      }
    })

    ws.on('close', async () => {
      const client = clients.get(ws)
      if (client) {
        logger.info({ sessionId: client.sessionId }, '[VoiceWS] Client disconnected')
        await endCallSession(client.sessionId).catch(() => {})
        clients.delete(ws)
      }
    })

    ws.on('error', (err) => {
      logger.error({ err, sessionId }, '[VoiceWS] WebSocket error')
    })
  })

  logger.info('[VoiceWS] WebSocket server attached at /ws/voice')
}

async function handleAudioTurn(client: VoiceClient): Promise<void> {
  if (client.audioChunks.length === 0) {
    client.ws.send(JSON.stringify({ type: 'error', message: 'No audio received' }))
    return
  }

  // Merge all chunks into a single buffer
  const fullAudio = Buffer.concat(client.audioChunks)
  client.audioChunks = []  // reset for next turn

  client.ws.send(JSON.stringify({ type: 'processing' }))

  try {
    const turn = await processVoiceTurn(
      client.sessionId,
      client.organizationId,
      fullAudio,
      'audio/webm'  // browser MediaRecorder uses webm/opus by default
    )

    // Send transcript back to frontend
    client.ws.send(JSON.stringify({
      type: 'transcript',
      userText: turn.userText,
      aiText: turn.aiText,
      language: turn.language,
    }))

    // Send audio response as binary
    client.ws.send(turn.audioBuffer)

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Processing error'
    logger.error({ err, sessionId: client.sessionId }, '[VoiceWS] Turn processing failed')
    client.ws.send(JSON.stringify({ type: 'error', message }))
  }
}
