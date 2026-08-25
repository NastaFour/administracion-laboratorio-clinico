import { beforeEach, describe, expect, it } from 'vitest'
import { useSessionStore } from './useSessionStore'

const SESSION = {
  userId: 1,
  usuario: 'admin',
  nombre: 'Admin',
  rol: 'admin' as const,
  loginAt: new Date().toISOString(),
  debe_cambiar_clave: false,
}

describe('useSessionStore', () => {
  beforeEach(() => {
    useSessionStore.setState({
      session: SESSION,
      locked: false,
      idleTimeoutMs: 5 * 60 * 1000,
      loading: false,
      error: null,
    })
  })

  it('expire drops the session and locks (main-side watchdog event)', () => {
    useSessionStore.getState().expire()
    const { session, locked } = useSessionStore.getState()
    expect(session).toBeNull()
    expect(locked).toBe(true)
  })

  it('lock keeps the session but locks the UI', () => {
    useSessionStore.getState().lock()
    const { session, locked } = useSessionStore.getState()
    expect(session).not.toBeNull()
    expect(locked).toBe(true)
  })
})
