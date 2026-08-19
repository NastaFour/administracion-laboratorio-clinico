import { create } from 'zustand'
import type { Session } from '@/shared/contracts'

interface SessionState {
  session: Session | null
  locked: boolean
  idleTimeoutMs: number
  loading: boolean
  error: string | null

  restore: () => Promise<void>
  login: (usuario: string, clave: string) => Promise<void>
  logout: () => Promise<void>
  changePassword: (actual: string, nueva: string) => Promise<boolean>
  lock: () => void
  unlock: (clave: string) => Promise<void>
  resetIdle: () => void
  clearError: () => void
}

const DEFAULT_IDLE_TIMEOUT_MS = 5 * 60 * 1000

export const useSessionStore = create<SessionState>((set, get) => {
  let idleTimer: ReturnType<typeof setTimeout> | null = null

  const startIdleTimer = (): void => {
    if (idleTimer) {
      clearTimeout(idleTimer)
    }
    idleTimer = setTimeout(() => {
      const { session } = get()
      if (session) {
        set({ locked: true })
      }
    }, get().idleTimeoutMs)
  }

  const clearIdleTimer = (): void => {
    if (idleTimer) {
      clearTimeout(idleTimer)
      idleTimer = null
    }
  }

  return {
    session: null,
    locked: false,
    idleTimeoutMs: DEFAULT_IDLE_TIMEOUT_MS,
    loading: false,
    error: null,

    restore: async () => {
      const result = await window.api.auth.me()
      if (result.ok && result.data) {
        set({ session: result.data, locked: false, error: null })
        startIdleTimer()
      }
    },

    login: async (usuario, clave) => {
      set({ loading: true, error: null })
      const result = await window.api.auth.login({ usuario, clave })
      if (!result.ok) {
        set({ loading: false, error: result.error.message })
        return
      }
      set({ session: result.data, locked: false, loading: false, error: null })
      startIdleTimer()
    },

    logout: async () => {
      await window.api.auth.logout()
      clearIdleTimer()
      set({ session: null, locked: false, error: null })
    },

    changePassword: async (actual, nueva) => {
      set({ loading: true, error: null })
      const result = await window.api.auth.changePassword({ actual, nueva })
      if (!result.ok) {
        set({ loading: false, error: result.error.message })
        return false
      }
      set((state) => ({
        session: state.session ? { ...state.session, debe_cambiar_clave: false } : null,
        loading: false,
        error: null,
      }))
      return true
    },

    lock: () => {
      set({ locked: true })
      clearIdleTimer()
    },

    unlock: async (clave) => {
      const { session } = get()
      if (!session) {
        return
      }
      set({ loading: true, error: null })
      const result = await window.api.auth.login({ usuario: session.usuario, clave })
      if (!result.ok) {
        set({ loading: false, error: result.error.message })
        return
      }
      set({ session: result.data, locked: false, loading: false, error: null })
      startIdleTimer()
    },

    resetIdle: () => {
      if (get().session && !get().locked) {
        startIdleTimer()
      }
    },

    clearError: () => {
      set({ error: null })
    },
  }
})
