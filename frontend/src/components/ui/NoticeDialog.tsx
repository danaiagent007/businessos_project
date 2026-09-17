import { useUIStore } from '@/stores/ui'

export function NoticeDialog() {
  const { notice, clearNotice } = useUIStore()
  if (!notice) return null
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Notice"
      style={{ position: 'fixed', inset: 0, background: '#15102050', zIndex: 50, display: 'grid', placeItems: 'center', padding: 16 }}
      onClick={clearNotice}
    >
      <div
        style={{ background: 'white', borderRadius: 10, padding: '28px 28px 22px', maxWidth: 420, width: '100%', boxShadow: '0 20px 60px #0002' }}
        onClick={(e) => e.stopPropagation()}
      >
        <strong style={{ fontSize: 15, fontWeight: 560 }}>A little clarity</strong>
        <p style={{ marginTop: 10, fontSize: 13, lineHeight: 1.8, color: '#6b6975' }}>{notice}</p>
        <button
          onClick={clearNotice}
          style={{ marginTop: 20, padding: '8px 16px', background: '#7450d7', color: 'white', borderRadius: 6, fontSize: 12, fontWeight: 550 }}
        >
          Got it
        </button>
      </div>
    </div>
  )
}
