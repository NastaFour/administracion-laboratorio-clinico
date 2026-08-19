import { describe, it, expect, beforeEach } from 'vitest'
import { comparePassword, hashPassword, login, logout, getSession, setSession } from './auth'
import { createTestDb } from '../repositories/test-helpers'
import { bootstrapAdminUser, setUserPassword } from '../repositories/users'

describe('auth service', () => {
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
