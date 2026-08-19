import { describe, it, expect } from 'vitest'
import { createTestDb } from '../repositories/test-helpers'
import { writeAudit } from './audit'
import { listAuditEntries } from '../repositories/audit'
import { bootstrapAdminUser } from '../repositories/users'
import { hashPassword } from './auth'

describe('audit service', () => {
  it('writes an append-only audit entry', async () => {
    const { db, cleanup } = await createTestDb()
    try {
      const hash = await hashPassword('admin123')
      const user = bootstrapAdminUser(db, hash)
      if (!user) {
        throw new Error('Bootstrap admin was not created')
      }

      writeAudit(db, {
        usuario_id: user.id,
        accion: 'login',
        entidad: 'usuario',
        entidad_id: user.id,
        despues: { channel: 'auth:login' },
      })

      const entries = listAuditEntries(db)
      expect(entries).toHaveLength(1)
      expect(entries[0].accion).toBe('login')
      expect(entries[0].entidad).toBe('usuario')
      expect(entries[0].entidad_id).toBe(user.id)
      expect(entries[0].despues).toEqual({ channel: 'auth:login' })
    } finally {
      cleanup()
    }
  })
})
