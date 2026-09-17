import { useState, useRef, useCallback, useEffect } from 'react'
import { useOrganization } from '@clerk/clerk-react'
import { Phone, PhoneOff, Mic, MicOff, Loader2, Volume2 } from 'lucide-react'
import { useNavigate } from 'react-router'
import { useApiClient } from '@/lib/api'

type CallState = 'idle' | 'connecting' | 'active' | 'processing' | 'ended'

interface Message {
  role: 'user' | 'ai'
  text: string
  time: string
}

export default function VoiceDemo() {
  const { organization } = useOrganization()
  const navigate = useNavigate()
  const api = useApiClient()

  const [callState, setCallState] = useState<CallState>('idle')
  const [isRecording, setIsRecording] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [aiSpeaking, setAiSpeaking] = useState(false)

  const wsRef = useRef<WebSocket | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Start call ──────────────────────────────────────────────────────────────
  const startCall = useCallback(async () => {
    if (!organization) return
    setError(null)
    setCallState('connecting')

    try {
      // 1. Create call session on backend
      const { sessionId: sid } = await api.calls.createSession()
      setSessionId(sid)

      // 2. Connect WebSocket
      const wsBase = (import.meta.env.VITE_API_URL || 'http://localhost:4000')
        .replace('http', 'ws').replace('https', 'wss')
      const ws = new WebSocket(`${wsBase}/ws/voice?sessionId=${sid}&orgId=${organization.id}`)
      wsRef.current = ws

      ws.onopen = () => {
        setCallState('active')
        addMessage('ai', '👋 Hello! I\'m your AI business assistant. How can I help you today?')
      }

      ws.onmessage = async (event) => {
        if (event.data instanceof Blob) {
          // Binary audio from AI — play it
          setAiSpeaking(true)
          const arrayBuffer = await event.data.arrayBuffer()
          await playAudio(arrayBuffer)
          setAiSpeaking(false)
          setCallState('active')
        } else {
          const msg = JSON.parse(event.data)
          if (msg.type === 'transcript') {
            addMessage('user', msg.userText)
            addMessage('ai', msg.aiText)
          } else if (msg.type === 'processing') {
            setCallState('processing')
          } else if (msg.type === 'error') {
            setError(msg.message)
            setCallState('active')
          } else if (msg.type === 'call_ended') {
            setCallState('ended')
          }
        }
      }

      ws.onerror = () => {
        setError('Connection error. Please try again.')
        setCallState('idle')
      }

      ws.onclose = () => {
        if (callState !== 'ended') setCallState('idle')
      }

    } catch (err) {
      setError('Failed to start call. Please try again.')
      setCallState('idle')
    }
  }, [organization, callState])

  // ── End call ────────────────────────────────────────────────────────────────
  const endCall = useCallback(() => {
    wsRef.current?.send(JSON.stringify({ type: 'end_call' }))
    recorderRef.current?.stop()
    wsRef.current?.close()
    setCallState('ended')
    setIsRecording(false)
  }, [])

  // ── Push-to-talk: start recording ──────────────────────────────────────────
  const startRecording = useCallback(async () => {
    if (callState !== 'active' || isRecording) return
    setError(null)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      recorderRef.current = recorder

      const chunks: Blob[] = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data)
          wsRef.current?.send(e.data)
        }
      }

      recorder.onstop = () => {
        wsRef.current?.send(JSON.stringify({ type: 'audio_end' }))
        stream.getTracks().forEach(t => t.stop())
        setIsRecording(false)
      }

      recorder.start(250) // send chunks every 250ms
      setIsRecording(true)
    } catch {
      setError('Microphone access denied. Please allow microphone and try again.')
    }
  }, [callState, isRecording])

  // ── Push-to-talk: stop recording ──────────────────────────────────────────
  const stopRecording = useCallback(() => {
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.stop()
    }
  }, [])

  // ── Play audio buffer ──────────────────────────────────────────────────────
  async function playAudio(arrayBuffer: ArrayBuffer) {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext()
    }
    const ctx = audioContextRef.current
    const decoded = await ctx.decodeAudioData(arrayBuffer)
    const source = ctx.createBufferSource()
    source.buffer = decoded
    source.connect(ctx.destination)
    source.start()
    return new Promise<void>(resolve => { source.onended = () => resolve() })
  }

  function addMessage(role: 'user' | 'ai', text: string) {
    setMessages(prev => [...prev, {
      role,
      text,
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    }])
  }

  // ── UI ─────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">AI Voice Agent</h1>
          <p className="text-violet-300 text-sm">Powered by Sarvam AI · Groq LLM</p>
        </div>

        {/* Status orb */}
        <div className="flex justify-center mb-8">
          <div className={`relative w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500
            ${callState === 'idle' || callState === 'ended' ? 'bg-slate-800' : ''}
            ${callState === 'connecting' ? 'bg-violet-900 animate-pulse' : ''}
            ${callState === 'active' && !isRecording ? 'bg-violet-700' : ''}
            ${isRecording ? 'bg-rose-600 animate-pulse' : ''}
            ${callState === 'processing' || aiSpeaking ? 'bg-violet-800 animate-pulse' : ''}
          `}>
            {/* Ripple rings when active */}
            {(callState === 'active' || callState === 'processing') && (
              <>
                <div className="absolute inset-0 rounded-full border-2 border-violet-400 animate-ping opacity-30" />
                <div className="absolute inset-0 rounded-full border border-violet-500 animate-ping opacity-20" style={{ animationDelay: '0.5s' }} />
              </>
            )}
            {isRecording && (
              <div className="absolute inset-0 rounded-full border-2 border-rose-400 animate-ping opacity-40" />
            )}

            {/* Icon */}
            {callState === 'idle' || callState === 'ended' ? (
              <Phone className="w-12 h-12 text-slate-400" />
            ) : callState === 'connecting' ? (
              <Loader2 className="w-12 h-12 text-violet-300 animate-spin" />
            ) : callState === 'processing' ? (
              <Loader2 className="w-12 h-12 text-violet-200 animate-spin" />
            ) : aiSpeaking ? (
              <Volume2 className="w-12 h-12 text-violet-200" />
            ) : isRecording ? (
              <MicOff className="w-12 h-12 text-white" />
            ) : (
              <Mic className="w-12 h-12 text-violet-200" />
            )}
          </div>
        </div>

        {/* Status label */}
        <div className="text-center mb-6">
          <span className="text-sm font-medium text-slate-300">
            {callState === 'idle' && 'Ready to start'}
            {callState === 'connecting' && 'Connecting...'}
            {callState === 'active' && !isRecording && 'Hold button to speak'}
            {isRecording && '🔴 Recording — release when done'}
            {callState === 'processing' && 'AI is thinking...'}
            {aiSpeaking && 'AI is speaking...'}
            {callState === 'ended' && 'Call ended'}
          </span>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-rose-900/40 border border-rose-700 rounded-xl p-3 text-rose-300 text-sm text-center mb-4">
            {error}
          </div>
        )}

        {/* Transcript */}
        {messages.length > 0 && (
          <div className="bg-slate-900/60 backdrop-blur rounded-2xl border border-slate-700/50 p-4 mb-6 max-h-64 overflow-y-auto space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs lg:max-w-sm px-4 py-2.5 rounded-2xl text-sm ${
                  m.role === 'user'
                    ? 'bg-violet-600 text-white rounded-br-sm'
                    : 'bg-slate-700 text-slate-100 rounded-bl-sm'
                }`}>
                  <p>{m.text}</p>
                  <p className={`text-xs mt-1 ${m.role === 'user' ? 'text-violet-200' : 'text-slate-400'}`}>
                    {m.time}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          {callState === 'idle' || callState === 'ended' ? (
            <button
              onClick={startCall}
              className="flex items-center gap-2 px-8 py-4 bg-violet-600 hover:bg-violet-500 text-white rounded-2xl font-semibold text-lg transition-all duration-200 hover:scale-105 shadow-lg shadow-violet-900/50"
            >
              <Phone className="w-5 h-5" />
              {callState === 'ended' ? 'New Call' : 'Start Call'}
            </button>
          ) : (
            <>
              {/* Push-to-talk button */}
              {callState === 'active' && (
                <button
                  onMouseDown={startRecording}
                  onMouseUp={stopRecording}
                  onTouchStart={startRecording}
                  onTouchEnd={stopRecording}
                  className={`flex items-center gap-2 px-8 py-4 rounded-2xl font-semibold text-lg transition-all duration-200 select-none ${
                    isRecording
                      ? 'bg-rose-600 text-white scale-105 shadow-lg shadow-rose-900/50'
                      : 'bg-slate-700 hover:bg-slate-600 text-slate-100 hover:scale-105'
                  }`}
                >
                  <Mic className="w-5 h-5" />
                  {isRecording ? 'Release to Send' : 'Hold to Speak'}
                </button>
              )}

              {/* End call */}
              <button
                onClick={endCall}
                className="flex items-center gap-2 px-6 py-4 bg-rose-700 hover:bg-rose-600 text-white rounded-2xl font-semibold transition-all duration-200 hover:scale-105"
              >
                <PhoneOff className="w-5 h-5" />
                End
              </button>
            </>
          )}
        </div>

        {/* View calls history link */}
        {callState === 'ended' && (
          <div className="text-center mt-6">
            <button
              onClick={() => navigate('/calls')}
              className="text-violet-400 hover:text-violet-300 text-sm underline"
            >
              View call history →
            </button>
          </div>
        )}

        <p className="text-center text-xs text-slate-600 mt-8">
          STT: Sarvam Saaras v3 · LLM: Groq · TTS: Sarvam Bulbul v3
        </p>
      </div>
    </div>
  )
}
