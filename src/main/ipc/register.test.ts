import { describe, it, expect, beforeEach } from 'vitest'
import { z } from 'zod'
import { createTestDb } from '../repositories/test-helpers'
import { buildGuardedHandler } from './register'
import { ERROR_CODES } from '@/shared/contracts'
import type { Role, Session } from '@/shared/contracts'
import type { AuditInput } from '../services/audit'

describe('ipc register guard', () => {
  const schema = z.object({ value: z.number() })
  const roles: Role[] = ['bioanalista', 'admin']
  const fn = async (_db: unknown, req: { value: number }) => req.value * 2

  let auditCalls: AuditInput[] = []
  let currentSession: Session | null = null

  beforeEach(() => {
    auditCalls = []
    currentSession = null
  })

  function makeHandler(db: unknown) {
    return buildGuardedHandler(
      db as never,
      'test:channel',
      roles,
      schema,
      fn,
      {
        getSession: () => currentSession,
        writeAudit: (_db, input) => {
          auditCalls.push(input)
        },
      },
    )
  }

  it('blocks when no session exists', async () => {
    const { db, cleanup } = await createTestDb()
    try {
      const handler = makeHandler(db)
      const result = await handler({}, { value: 5 })
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe(ERROR_CODES.PERMISSION_DENIED)
      }
    } finally {
      cleanup()
    }
  })

  it('allows authorized roles and audits permission denials', async () => {
    const { db, cleanup } = await createTestDb()
    try {
      const handler = makeHandler(db)

      const unauthorized: Session = {
        userId: 2,
        usuario: 'recepcion',
        nombre: 'Recepcion',
        rol: 'recepcion',
        loginAt: new Date().toISOString(),
        debe_cambiar_clave: false,
      }
      currentSession = unauthorized
      const denied = await handler({}, { value: 5 })
      expect(denied.ok).toBe(false)
      expect(auditCalls).toHaveLength(1)
      expect(auditCalls[0].accion).toBe('permiso.denegado')

      const authorized: Session = {
        userId: 1,
        usuario: 'bio',
        nombre: 'Bioanalista',
        rol: 'bioanalista',
        loginAt: new Date().toISOString(),
        debe_cambiar_clave: false,
      }
      currentSession = authorized
      const allowed = await handler({}, { value: 5 })
      expect(allowed.ok).toBe(true)
      if (allowed.ok) {
        expect(allowed.data).toBe(10)
      }
    } finally {
      cleanup()
    }
  })

  it('returns validation error for invalid payload', async () => {
    const { db, cleanup } = await createTestDb()
    try {
      const handler = makeHandler(db)
      currentSession = {
        userId: 1,
        usuario: 'admin',
        nombre: 'Admin',
        rol: 'admin',
        loginAt: new Date().toISOString(),
        debe_cambiar_clave: false,
      }
      const result = await handler({}, { value: 'not-a-number' })
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe(ERROR_CODES.VALIDATION_ERROR)
      }
    } finally {
      cleanup()
    }
  })
})
