import { useState, useEffect, useRef, useCallback } from 'react'
import {
  MessageSquare, FileText, Workflow, Check, Blocks, ShieldCheck, Zap,
  Send, Bot, User, Clock, CheckCheck, AlertCircle, RefreshCw, X, Pencil,
  Phone, Loader2,
} from 'lucide-react'
import { OrganizationSwitcher, UserButton, SignInButton, useAuth } from '@clerk/clerk-react'
import { useApiClient } from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Conversation {
  _id: string
  contactPhone: string
  contactName: string
  channel: string
  status: 'open' | 'pending_reply' | 'resolved'
  lastMessage: string
  lastMessageAt: string
  unreadCount: number
}

interface Message {
  _id: string
  direction: 'inbound' | 'outbound'
  content: string
  aiDraft: string
  status: 'received' | 'sent' | 'delivered' | 'read' | 'pending_approval' | 'rejected'
  isAutoReply: boolean
  timestamp: string
  intent: string
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ConvItem({ conv, selected, onClick }: { conv: Conversation; selected: boolean; onClick: () => void }) {
  const ts = conv.lastMessageAt ? new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
  return (
    <button
      onClick={onClick}
      style={{
        display: 'block', width: '100%', textAlign: 'left',
        padding: '12px 14px', border: 'none', cursor: 'pointer',
        background: selected ? '#f0ecff' : 'transparent',
        borderLeft: selected ? '3px solid #7450d7' : '3px solid transparent',
        borderBottom: '1px solid #f0eff5',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <div style={{
            width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
            background: selected ? '#7450d7' : '#e8e6f5',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: selected ? 'white' : '#7450d7', fontWeight: 700, fontSize: 13,
          }}>
            {(conv.contactName || conv.contactPhone)[0].toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 12, color: '#1a1625', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 140 }}>
              {conv.contactName || conv.contactPhone}
            </div>
            <div style={{ fontSize: 11, color: '#9991a4', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 140 }}>
              {conv.lastMessage || 'No messages yet'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
          <span style={{ fontSize: 9, color: '#b5afc8' }}>{ts}</span>
          {conv.status === 'pending_reply' && (
            <span style={{ background: '#fef3c7', color: '#d97706', borderRadius: 99, padding: '1px 6px', fontSize: 9, fontWeight: 700, whiteSpace: 'nowrap' }}>
              ⏳ Pending
            </span>
          )}
          {conv.unreadCount > 0 && (
            <span style={{ background: '#7450d7', color: 'white', borderRadius: 99, padding: '1px 6px', fontSize: 9, fontWeight: 700 }}>
              {conv.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

function MessageBubble({ msg, onApprove, onReject, approving }: {
  msg: Message
  onApprove: (draft: string) => void
  onReject: () => void
  approving: boolean
}) {
  const [editDraft, setEditDraft] = useState(msg.aiDraft)
  const [editing, setEditing]    = useState(false)
  const isIn = msg.direction === 'inbound'
  const isPending = msg.status === 'pending_approval'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: isIn ? 'flex-start' : 'flex-end', marginBottom: 12 }}>
      {/* Message bubble */}
      <div style={{
        maxWidth: '72%', padding: '10px 14px', borderRadius: isIn ? '4px 14px 14px 14px' : '14px 4px 14px 14px',
        background: isIn ? '#f5f4fb' : 'linear-gradient(135deg,#7450d7,#9b6bff)',
        color: isIn ? '#2d2440' : 'white', fontSize: 13, lineHeight: 1.5,
        boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
      }}>
        {msg.content}
        {msg.isAutoReply && (
          <span style={{ display: 'block', fontSize: 9, opacity: 0.7, marginTop: 4 }}>
            <Bot size={9} style={{ display: 'inline', marginRight: 2 }} />auto-reply
          </span>
        )}
      </div>

      {/* Meta info */}
      <div style={{ fontSize: 9, color: '#b5afc8', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
        <Clock size={9} />
        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        {msg.intent && isIn && <span style={{ background: '#f0eff5', borderRadius: 4, padding: '1px 5px' }}>{msg.intent.replace(/_/g, ' ')}</span>}
        {msg.status === 'sent' && !isIn && <CheckCheck size={10} />}
      </div>

      {/* Pending AI draft approval */}
      {isPending && msg.aiDraft && (
        <div style={{ maxWidth: '80%', marginTop: 8, background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 12, padding: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <AlertCircle size={13} color="#d97706" />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#d97706' }}>AI Draft — Awaiting Approval</span>
          </div>

          {editing ? (
            <textarea
              value={editDraft}
              onChange={(e) => setEditDraft(e.target.value)}
              rows={3}
              style={{ width: '100%', boxSizing: 'border-box', border: '1.5px solid #fde68a', borderRadius: 8, padding: '8px 10px', fontSize: 12, resize: 'vertical', fontFamily: 'inherit', outline: 'none', background: 'white' }}
            />
          ) : (
            <p style={{ fontSize: 12, color: '#6b5f7a', lineHeight: 1.5, margin: '0 0 10px', background: 'white', borderRadius: 8, padding: '8px 10px', border: '1px solid #f3f0e0' }}>
              {editDraft}
            </p>
          )}

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button onClick={() => onApprove(editDraft)} disabled={approving}
              style={{ background: '#16a34a', color: 'white', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
              {approving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />} Approve & Send
            </button>
            <button onClick={() => setEditing(!editing)}
              style={{ background: '#f5f4fb', border: '1px solid #e0dcf5', borderRadius: 8, padding: '6px 12px', fontSize: 11, color: '#7450d7', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Pencil size={11} /> {editing ? 'Done editing' : 'Edit'}
            </button>
            <button onClick={onReject}
              style={{ background: 'white', border: '1px solid #fca5a5', borderRadius: 8, padding: '6px 12px', fontSize: 11, color: '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
              <X size={11} /> Reject
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Inbox Page ──────────────────────────────────────────────────────────

export function InboxPage() {
  const api = useApiClient()
  const [convs, setConvs]             = useState<Conversation[]>([])
  const [selectedId, setSelectedId]   = useState<string | null>(null)
  const [messages, setMessages]       = useState<Message[]>([])
  const [loadingConvs, setLoadingConvs] = useState(true)
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [sendText, setSendText]       = useState('')
  const [sending, setSending]         = useState(false)
  const [approving, setApproving]     = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const selectedConv = convs.find((c) => c._id === selectedId)

  const loadConvs = useCallback(async () => {
    try {
      const res = await api.conversations.list()
      setConvs(res.conversations as Conversation[])
    } catch { /* ignore */ }
    setLoadingConvs(false)
  }, [])

  const loadMessages = useCallback(async (id: string) => {
    setLoadingMsgs(true)
    try {
      const res = await api.conversations.messages(id)
      setMessages(res.messages as Message[])
    } catch { /* ignore */ }
    setLoadingMsgs(false)
  }, [])

  useEffect(() => { loadConvs() }, [])

  useEffect(() => {
    if (selectedId) loadMessages(selectedId)
  }, [selectedId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    if (!sendText.trim() || !selectedId) return
    setSending(true)
    try {
      await api.conversations.send(selectedId, sendText.trim())
      setSendText('')
      await loadMessages(selectedId)
      await loadConvs()
    } catch { /* ignore */ }
    setSending(false)
  }

  async function handleApprove(msgId: string, draft: string) {
    setApproving(msgId)
    try {
      await api.conversations.approve(msgId, draft)
      await loadMessages(selectedId!)
      await loadConvs()
    } catch { /* ignore */ }
    setApproving(null)
  }

  async function handleReject(msgId: string) {
    try {
      await api.conversations.reject(msgId)
      await loadMessages(selectedId!)
    } catch { /* ignore */ }
  }

  const pendingCount = convs.filter((c) => c.status === 'pending_reply').length

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">AI INBOX</div>
          <h1>WhatsApp Inbox</h1>
          <p>Every customer conversation — with AI-drafted replies ready for your approval.</p>
        </div>
        <div className="heading-actions">
          {pendingCount > 0 && (
            <span style={{ background: '#fef3c7', color: '#d97706', borderRadius: 8, padding: '6px 12px', fontSize: 11, fontWeight: 700 }}>
              ⏳ {pendingCount} pending {pendingCount === 1 ? 'reply' : 'replies'}
            </span>
          )}
          <button onClick={loadConvs} style={{ background: '#f5f4fb', border: '1px solid #e0dcf5', borderRadius: 6, padding: '7px 10px', cursor: 'pointer', color: '#7450d7', display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 0, height: 'calc(100vh - 200px)', minHeight: 500, borderRadius: 14, overflow: 'hidden', border: '1px solid #e8e6f0', background: 'white', boxShadow: '0 4px 24px rgba(0,0,0,0.07)' }}>

        {/* Left: Conversation list */}
        <div style={{ width: 280, flexShrink: 0, borderRight: '1px solid #f0eff5', overflowY: 'auto' }}>
          <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid #f0eff5' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#7450d7', margin: 0 }}>
              Conversations <span style={{ fontWeight: 400, color: '#b5afc8' }}>({convs.length})</span>
            </p>
          </div>

          {loadingConvs
            ? <div style={{ padding: 32, display: 'flex', justifyContent: 'center' }}><Loader2 className="animate-spin" style={{ color: '#7450d7' }} /></div>
            : convs.length === 0
              ? <div style={{ padding: '48px 20px', textAlign: 'center', color: '#b5afc8' }}>
                  <MessageSquare size={24} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
                  <p style={{ fontSize: 12, margin: 0, fontWeight: 600, color: '#9991a4' }}>No conversations yet</p>
                  <p style={{ fontSize: 11, margin: '4px 0 0', lineHeight: 1.5 }}>
                    Connect WhatsApp via Meta Business API and messages will appear here automatically.
                  </p>
                </div>
              : convs.map((c) => (
                  <ConvItem
                    key={c._id}
                    conv={c}
                    selected={c._id === selectedId}
                    onClick={() => setSelectedId(c._id)}
                  />
                ))
          }
        </div>

        {/* Right: Chat view */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {!selectedId
            ? <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#b5afc8', gap: 12 }}>
                <MessageSquare size={36} style={{ opacity: 0.3 }} />
                <p style={{ fontSize: 13, margin: 0, color: '#9991a4', fontWeight: 600 }}>Select a conversation</p>
                <p style={{ fontSize: 11, margin: 0 }}>Click any conversation on the left to view messages</p>
              </div>
            : <>
                {/* Chat header */}
                <div style={{ padding: '14px 18px', borderBottom: '1px solid #f0eff5', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#7450d7,#9b6bff)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                    {(selectedConv?.contactName || selectedConv?.contactPhone || '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 13, margin: 0, color: '#1a1625' }}>
                      {selectedConv?.contactName || selectedConv?.contactPhone}
                    </p>
                    <p style={{ fontSize: 10, margin: 0, color: '#b5afc8', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Phone size={9} /> {selectedConv?.contactPhone}
                      <span style={{ background: '#dcfce7', color: '#16a34a', borderRadius: 4, padding: '1px 5px', marginLeft: 4, fontWeight: 700 }}>WhatsApp</span>
                    </p>
                  </div>
                  <div style={{ marginLeft: 'auto' }}>
                    <span style={{
                      fontSize: 10, fontWeight: 600, borderRadius: 6, padding: '3px 8px',
                      background: selectedConv?.status === 'pending_reply' ? '#fef3c7' : '#dcfce7',
                      color: selectedConv?.status === 'pending_reply' ? '#d97706' : '#16a34a',
                    }}>
                      {selectedConv?.status === 'pending_reply' ? '⏳ Pending reply' : '● Active'}
                    </span>
                  </div>
                </div>

                {/* Messages */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px' }}>
                  {loadingMsgs
                    ? <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Loader2 className="animate-spin" style={{ color: '#7450d7' }} /></div>
                    : messages.length === 0
                      ? <div style={{ textAlign: 'center', padding: 32, color: '#b5afc8' }}>
                          <p style={{ fontSize: 12 }}>No messages yet in this conversation</p>
                        </div>
                      : <>
                          {messages.map((msg) => (
                            <MessageBubble
                              key={msg._id}
                              msg={msg}
                              onApprove={(draft) => handleApprove(msg._id, draft)}
                              onReject={() => handleReject(msg._id)}
                              approving={approving === msg._id}
                            />
                          ))}
                          <div ref={bottomRef} />
                        </>
                  }
                </div>

                {/* Send box */}
                <div style={{ padding: '12px 16px', borderTop: '1px solid #f0eff5', display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                  <textarea
                    id="inbox-send-textarea"
                    placeholder="Type a message..."
                    value={sendText}
                    onChange={(e) => setSendText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                    rows={2}
                    style={{ flex: 1, border: '1.5px solid #e0dcf5', borderRadius: 10, padding: '9px 12px', fontSize: 12, resize: 'none', outline: 'none', fontFamily: 'inherit', lineHeight: 1.5 }}
                  />
                  <button
                    id="inbox-send-btn"
                    onClick={handleSend}
                    disabled={sending || !sendText.trim()}
                    style={{ background: sending || !sendText.trim() ? '#e0dcf5' : 'linear-gradient(135deg,#7450d7,#9b6bff)', color: 'white', border: 'none', borderRadius: 10, padding: '10px 14px', cursor: sending ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
                    {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  </button>
                </div>
              </>
          }
        </div>
      </div>

      {/* Setup guide banner */}
      <div style={{ marginTop: 16, background: '#f0ecff', border: '1.5px solid #c8b8f8', borderRadius: 12, padding: '14px 18px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <Bot size={18} color="#7450d7" style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <p style={{ fontWeight: 700, fontSize: 13, color: '#4b3f72', margin: '0 0 4px' }}>Connect WhatsApp to start receiving messages</p>
          <p style={{ fontSize: 11, color: '#7b6fa0', margin: 0, lineHeight: 1.6 }}>
            You need a <strong>Meta Business Account</strong> + WhatsApp Business API access.
            Once connected, add <code style={{ background: '#e0dcf5', borderRadius: 4, padding: '1px 5px' }}>WHATSAPP_TOKEN</code>,{' '}
            <code style={{ background: '#e0dcf5', borderRadius: 4, padding: '1px 5px' }}>WHATSAPP_PHONE_NUMBER_ID</code>, and{' '}
            <code style={{ background: '#e0dcf5', borderRadius: 4, padding: '1px 5px' }}>WHATSAPP_VERIFY_TOKEN</code> to your <code>.env</code>.
            Webhook URL: <code style={{ background: '#e0dcf5', borderRadius: 4, padding: '1px 5px' }}>https://your-domain.com/api/webhooks/whatsapp</code>
          </p>
        </div>
      </div>
    </>
  )
}

// ─── Shared "coming soon" for other pages ────────────────────────────────────

function ComingSoon({ icon: Icon, title, description }: { icon: typeof MessageSquare; title: string; description: string }) {
  return (
    <section className="panel">
      <div style={{ padding: '80px 24px', textAlign: 'center', color: '#9991a4' }}>
        <Icon size={32} style={{ margin: '0 auto 12px', opacity: .35 }} />
        <span style={{ display: 'inline-block', background: '#f0f0f4', color: '#8c8997', border: '1px solid #e6e5ed', padding: '2px 8px', fontSize: 9, fontWeight: 550, borderRadius: 4, letterSpacing: 1, marginBottom: 12 }}>NEXT CHAPTER</span>
        <p style={{ fontSize: 14, fontWeight: 550, color: '#3c3a45', marginBottom: 8 }}>{title}</p>
        <p style={{ fontSize: 12, lineHeight: 1.8, maxWidth: 320, margin: '0 auto' }}>{description}</p>
      </div>
    </section>
  )
}

export function DocumentsPage() {
  return (
    <>
      <div className="page-heading"><div><div className="eyebrow">YOUR BUSINESS, IN FOCUS</div><h1>Documents</h1><p>Less paperwork. More perspective.</p></div></div>
      <ComingSoon icon={FileText} title="Less paperwork. More perspective." description="Document uploads, extraction, and search require the S3 and processing services in the next phase." />
    </>
  )
}

export function AutomationsPage() {
  return (
    <>
      <div className="page-heading"><div><div className="eyebrow">YOUR BUSINESS, IN FOCUS</div><h1>Automations</h1><p>Let the little things take care of themselves.</p></div></div>
      <ComingSoon icon={Workflow} title="Let the little things take care of themselves" description="AI follow-up scheduling and automated workflows coming in Phase 9." />
    </>
  )
}

export function AnalyticsPage() {
  return (
    <>
      <div className="page-heading"><div><div className="eyebrow">YOUR BUSINESS, IN FOCUS</div><h1>Analytics</h1><p>Understand your business at a glance.</p></div></div>
      <ComingSoon icon={Workflow} title="Business analytics coming soon" description="Lead conversion rates, revenue trends, and AI-driven business insights are planned for Phase 7." />
    </>
  )
}

export function IntegrationsPage() {
  const integrations = [
    { name: 'MongoDB Atlas', description: 'Secure, organization-scoped lead storage.', icon: Blocks, status: 'Connected' },
    { name: 'Clerk', description: 'Authentication and workspace memberships.', icon: ShieldCheck, status: 'Connected' },
    { name: 'Upstash Redis', description: 'Per-organization write rate limiting.', icon: Zap, status: 'Connected' },
    { name: 'WhatsApp Business', description: 'Customer conversations and AI-powered replies.', icon: MessageSquare, status: 'Configured ✓' },
    { name: 'Google Workspace', description: 'Gmail, Calendar, Drive, and Sheets.', icon: FileText, status: 'Planned' },
    { name: 'Instagram', description: 'Bring customer DMs into your inbox.', icon: MessageSquare, status: 'Planned' },
  ]
  return (
    <>
      <div className="page-heading"><div><div className="eyebrow">YOUR BUSINESS, IN FOCUS</div><h1>Integrations</h1><p>Your tools. Better together.</p></div></div>
      <div className="integration-grid">
        {integrations.map(({ name, description, icon: Icon, status }) => (
          <article className="panel integration-card" key={name}>
            <span className="metric-icon purple"><Icon size={21} /></span>
            <h2>{name}</h2>
            <p>{description}</p>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#f0f0f4', borderRadius: 4, padding: '3px 8px', fontSize: 10, color: status === 'Planned' ? '#9796a2' : '#71a48f' }}>
              {status !== 'Planned' && <Check size={11} />} {status}
            </span>
          </article>
        ))}
      </div>
    </>
  )
}

export function SettingsPage() {
  const { isSignedIn } = useAuth()
  return (
    <>
      <div className="page-heading"><div><div className="eyebrow">YOUR BUSINESS, IN FOCUS</div><h1>Settings</h1><p>Workspace &amp; account.</p></div></div>
      <section className="panel p-7" style={{ padding: 28 }}>
        <h2 style={{ fontSize: 13, fontWeight: 550, marginBottom: 12 }}>Workspace &amp; account</h2>
        <p style={{ fontSize: 12, color: '#7b7c89', lineHeight: 1.8, marginBottom: 20 }}>Your account and organization are securely managed by Clerk. Organization admins can manage members using the workspace switcher.</p>
        {isSignedIn ? <><OrganizationSwitcher hidePersonal /><UserButton /></> : <SignInButton mode="modal"><button style={{ padding: '8px 16px', background: '#7450d7', color: 'white', borderRadius: 6, fontSize: 12, fontWeight: 550 }}>Sign in to manage your workspace</button></SignInButton>}
        <div className="panel-foot" style={{ borderTop: '1px solid var(--border)', marginTop: 24, paddingTop: 12, fontSize: 11, color: '#a19ba9' }}>CRM write access: Owner, Admin, and Manager. Viewer access is read-only.</div>
      </section>
    </>
  )
}
