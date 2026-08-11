import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SessionUser } from '#/domain/auth'

const SESSION_STORAGE_KEY = 'dohoro-session'

type SessionState = {
  user: SessionUser | null
  setUser: (user: SessionUser) => void
  clearSession: () => void
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      clearSession: () => set({ user: null }),
    }),
    {
      name: SESSION_STORAGE_KEY,
      partialize: (state) => ({ user: state.user }),
    },
  ),
)

export { SESSION_STORAGE_KEY }
