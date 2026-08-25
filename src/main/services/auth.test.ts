import { afterEach, describe, it, expect, beforeEach, vi } from 'vitest'
import {
  comparePassword,
  expireSession,
  getSession,
  hashPassword,
  IDLE_TIMEOUT_MS,
  login,
  logout,
  setIdleExpiryHandler,
  setSession,
  touchSession,
} from './auth'
import { createTestDb } from '../repositories/test-helpers'
import { bootstrapAdminUser, setUserPassword } from '../repositories/users'

describe('auth service', () => {
  afterEach(() => {
    logout()
  })

  describe('hashing', () => {
    it('hashes and verifies a password', async () => {
      const hash = await hashPassword('secret123')
      expect(hash).not.toBe('secret123')
      expect(await comparePassword('secret123', hash)).toBe(true)
      expect(await comparePassword('wrong', hash)).toBe(false)
    })

    it('uses cost 12 by default', async () => {
      const hash = await hashPassword('secret123')
      expect(hash).toMatch(/^\$2[aby]\$12\$/)
    })
  })

  describe('session', () => {
    beforeEach(() => {
      logout()
    })

    it('starts with no session', () => {
      expect(getSession()).toBeNull()
    })

    it('round-trips session set/get', () => {
      const session = {
        userId: 1,
        usuario: 'admin',
        nombre: 'Admin',
        rol: 'admin' as const,
        loginAt: new Date().toISOString(),
        debe_cambiar_clave: false,
      }
      setSession(session)
      expect(getSession()).toEqual(session)
      logout()
      expect(getSession()).toBeNull()
    })
  })

  describe('idle watchdog (design A4 — main-side enforcement)', () => {
    const makeSession = () => ({
      userId: 1,
      usuario: 'admin',
      nombre: 'Admin',
      rol: 'admin' as const,
      loginAt: new Date().toISOString(),
      debe_cambiar_clave: false,
    })

    beforeEach(() => {
      logout()
      setIdleExpiryHandler(null)
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
      setIdleExpiryHandler(null)
      logout()
    })

    it('expires the session after IDLE_TIMEOUT_MS without authenticated activity', () => {
      const onExpire = vi.fn()
      setIdleExpiryHandler(onExpire)
      setSession(makeSession())
      expect(getSession()).not.toBeNull()

      vi.advanceTimersByTime(IDLE_TIMEOUT_MS - 1)
      expect(getSession()).not.toBeNull()

      vi.advanceTimersByTime(1)
      expect(getSession()).toBeNull()
      expect(onExpire).toHaveBeenCalledTimes(1)
    })

    it('touchSession re-arms the timer (activity proxy)', () => {
      setSession(makeSession())
      vi.advanceTimersByTime(IDLE_TIMEOUT_MS / 2)
      touchSession()
      vi.advanceTimersByTime(IDLE_TIMEOUT_MS / 2)
      expect(getSession()).not.toBeNull()
      vi.advanceTimersByTime(IDLE_TIMEOUT_MS / 2)
      expect(getSession()).toBeNull()
    })

    it('logout disarms the watchdog — no expiry notification afterwards', () => {
      const onExpire = vi.fn()
      setIdleExpiryHandler(onExpire)
      setSession(makeSession())
      logout()
      vi.advanceTimersByTime(IDLE_TIMEOUT_MS * 2)
      expect(getSession()).toBeNull()
      expect(onExpire).not.toHaveBeenCalled()
    })

    it('expireSession clears the session immediately and notifies exactly once', () => {
      const onExpire = vi.fn()
      setIdleExpiryHandler(onExpire)
      setSession(makeSession())
      expireSession()
      expect(getSession()).toBeNull()
      expect(onExpire).toHaveBeenCalledTimes(1)
      expireSession()
      expect(onExpire).toHaveBeenCalledTimes(1)
    })
  })

  describe('login', () => {
    it('accepts correct credentials', async () => {
      const { db, cleanup } = await createTestDb()
      try {
        const hash = await hashPassword('admin123')
        bootstrapAdminUser(db, hash)
        const session = await login(db, 'admin', 'admin123')
        expect(session.usuario).toBe('admin')
        expect(session.rol).toBe('admin')
        expect(session.debe_cambiar_clave).toBe(true)
      } finally {
        cleanup()
      }
    })

    it('rejects wrong password', async () => {
      const { db, cleanup } = await createTestDb()
      try {
        const hash = await hashPassword('admin123')
        bootstrapAdminUser(db, hash)
        setUserPassword(db, 1, hash, false)
        await expect(login(db, 'admin', 'wrong')).rejects.toThrow('Usuario o clave inválidos')
      } finally {
        cleanup()
      }
    })

    it('rejects unknown user', async () => {
      const { db, cleanup } = await createTestDb()
      try {
        await expect(login(db, 'nobody', 'admin123')).rejects.toThrow('Usuario o clave inválidos')
      } finally {
        cleanup()
      }
    })
  })
})
