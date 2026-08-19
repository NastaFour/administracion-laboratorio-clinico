import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { createTestDb, createUser } from '../repositories/test-helpers'
import { buildGuardedHandler } from './register'
import { ordersChannels } from '@/shared/contracts'
import type { Session } from '@/shared/contracts'

const recepcionSession: Session = {
  userId: 2,
  usuario: 'recepcion1',
  nombre: 'Recepcion Uno',
  rol: 'recepcion',
  loginAt: new Date().toISOString(),
  debe_cambiar_clave: false,
}

const bioanalistaSession: Session = {
  userId: 3,
  usuario: 'bio1',
  nombre: 'Bioanalista Uno',
  rol: 'bioanalista',
  loginAt: new Date().toISOString(),
  debe_cambiar_clave: false,
}

describe('orders:authorizeCredit role guard', () => {
  let testDb: Awaited<ReturnType<typeof createTestDb>>
  const writeAudit = vi.fn()

  beforeEach(async () => {
    testDb = await createTestDb()
    createUser(testDb.db, 'admin1', 'admin')
    createUser(testDb.db, 'recepcion1', 'recepcion')
    createUser(testDb.db, 'bio1', 'bioanalista')
    writeAudit.mockReset()
  })

  afterEach(() => {
    testDb.cleanup()
  })

  it('blocks recepcion and writes a permission-denied audit entry', async () => {
    const handler = buildGuardedHandler(
      testDb.db,
      'orders:authorizeCredit',
      ['admin', 'bioanalista'],
      ordersChannels['orders:authorizeCredit'].request,
      async () => ({ id: 1 } as never),
      { getSession: () => recepcionSession, writeAudit },
    )

    const result = await handler({}, { id: 1, monto: 100, motivo: 'Test' })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('PERMISSION_DENIED')
    }
    expect(writeAudit).toHaveBeenCalledWith(
      testDb.db,
      expect.objectContaining({
        usuario_id: recepcionSession.userId,
        accion: 'permiso.denegado',
        entidad: 'usuario',
        entidad_id: recepcionSession.userId,
        despues: { channel: 'orders:authorizeCredit' },
      }),
    )
  })

  it('allows bioanalista to invoke the handler', async () => {
    const fn = vi.fn().mockResolvedValue({ id: 1, credito: true } as never)
    const handler = buildGuardedHandler(
      testDb.db,
      'orders:authorizeCredit',
      ['admin', 'bioanalista'],
      ordersChannels['orders:authorizeCredit'].request,
      fn,
      { getSession: () => bioanalistaSession, writeAudit },
    )

    const result = await handler({}, { id: 1, monto: 100, motivo: 'Test' })

    expect(result.ok).toBe(true)
    expect(fn).toHaveBeenCalled()
  })
})
