import { WebSocketServer, WebSocket } from 'ws'
import { Server, IncomingMessage } from 'http'
import { logger } from '../../common/logger.js'
import { CallSession } from './call.model.js'

export function attachRetellLLMWebSocket(httpServer: Server): void {
  const wss = new WebSocketServer({ noServer: true })

  // Intercept upgrade requests for our specific path
  httpServer.on('upgrade', (request: IncomingMessage, socket, head) => {
    const url = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`)
    // Retell appends the call_id to the URL: /api/retell/llm-ws/<call_id>
    if (url.pathname.startsWith('/api/retell/llm-ws')) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request)
      })
    }
  })

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const url = new URL(req.url || '', `http://${req.headers.host}`)
    const orgId = url.searchParams.get('orgId') || ''
    logger.info({ orgId }, '[Retell WS] Custom LLM connection opened')

    let callId = 'unknown'

    ws.on('message', async (data: string) => {
      try {
        const msg = JSON.parse(data.toString())
        
        if (msg.call && msg.call.call_id) {
          callId = msg.call.call_id
        }

        if (msg.interaction_type === 'update_only') {
          // Just a transcript update, no response needed
          return
        }

        if (msg.interaction_type === 'response_required') {
          const responseId = msg.response_id
          const messages = msg.transcript || []
          
          const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content || ''
          logger.info({ callId, lastUserMsg }, '[Retell WS] User said')

          if (!lastUserMsg.trim()) {
             ws.send(JSON.stringify({
               response_id: responseId,
               content: "I'm here! How can I help you?",
               content_complete: true,
               end_call: false
             }))
             return
          }

          // Call Groq (using same logic as before)
          const groqKey = (process.env.GROQ_API_KEYS || '').split(',')[0].trim()
          if (!groqKey) {
             ws.send(JSON.stringify({
               response_id: responseId,
               content: "I'm sorry, I'm having trouble right now.",
               content_complete: true
             }))
             return
          }

          const groqMessages = [
            { role: 'system', content: 'You are a helpful AI voice assistant for a business. Keep responses short and conversational (1-2 sentences).' },
            ...messages
              .filter((m: any) => m.role === 'user' || m.role === 'assistant')
              .slice(-10)
              .map((m: any) => ({ role: m.role, content: m.content }))
          ]

          // Use fetch for Groq streaming
          const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${groqKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'openai/gpt-oss-120b',
              messages: groqMessages,
              max_tokens: 120,
              temperature: 0.5,
              stream: true,
            }),
          })

          if (!groqRes.ok || !groqRes.body) {
            const errBody = await groqRes.text().catch(() => 'no body')
            logger.error({ status: groqRes.status, errBody }, '[Retell WS] Groq streaming error')
            ws.send(JSON.stringify({
              response_id: responseId,
              content: "I apologize, I'm having a technical issue.",
              content_complete: true
            }))
            return
          }

          // Read stream
          const reader = groqRes.body.getReader()
          const decoder = new TextDecoder('utf-8')
          let fullAiReply = ''
          let buffer = ''

          while (true) {
            const { value, done } = await reader.read()
            if (done) break
            
            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            // keep the last incomplete line in the buffer
            buffer = lines.pop() || ''
            
            for (const line of lines) {
              const trimmed = line.trim()
              if (trimmed.startsWith('data: ') && trimmed !== 'data: [DONE]') {
                try {
                  const data = JSON.parse(trimmed.slice(6))
                  const text = data.choices[0]?.delta?.content
                  if (text) {
                    fullAiReply += text
                    ws.send(JSON.stringify({
                      response_id: responseId,
                      content: text,
                      content_complete: false
                    }))
                  }
                } catch (e) {
                  // ignore parse error on incomplete chunks
                }
              }
            }
          }

          // Send complete signal
          ws.send(JSON.stringify({
            response_id: responseId,
            content: "",
            content_complete: true,
            end_call: false
          }))

          logger.info({ callId, fullAiReply }, '[Retell WS] AI replied')

          // Save to CallSession
          await CallSession.findOneAndUpdate(
            { sessionId: callId },
            {
              $push: {
                messages: [
                  { role: 'user', text: lastUserMsg, timestamp: new Date() },
                  { role: 'assistant', text: fullAiReply, timestamp: new Date() },
                ],
              },
              $setOnInsert: {
                organizationId: orgId || process.env.DEFAULT_ORG_ID,
                channel: 'twilio',
                status: 'active',
                transcript: '',
                durationSeconds: 0,
              }
            },
            { upsert: true }
          ).catch(e => logger.warn({ e }, '[Retell WS] Failed to save turn'))
        }
      } catch (err) {
        logger.error({ err }, '[Retell WS] Error processing message')
      }
    })

    ws.on('close', () => {
      logger.info({ callId }, '[Retell WS] Custom LLM connection closed')
    })
    
    ws.on('error', (err) => {
      logger.error({ err, callId }, '[Retell WS] Connection error')
    })
  })

  logger.info('[Retell WS] WebSocket Custom LLM attached at /api/retell/llm-ws')
}
