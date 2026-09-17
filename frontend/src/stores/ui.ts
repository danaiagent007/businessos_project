import { create } from 'zustand'

type View =
  | 'overview'
  | 'leads'
  | 'followups'
  | 'inbox'
  | 'documents'
  | 'automations'
  | 'analytics'
  | 'integrations'
  | 'settings'

interface UIState {
  mobileNavOpen: boolean
  setMobileNavOpen: (open: boolean) => void
  toggleMobileNav: () => void

  notice: string
  setNotice: (msg: string) => void
  clearNotice: () => void
}

export const useUIStore = create<UIState>((set) => ({
  mobileNavOpen: false,
  setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
  toggleMobileNav: () => set((s) => ({ mobileNavOpen: !s.mobileNavOpen })),

  notice: '',
  setNotice: (msg) => set({ notice: msg }),
  clearNotice: () => set({ notice: '' }),
}))

export type { View }
