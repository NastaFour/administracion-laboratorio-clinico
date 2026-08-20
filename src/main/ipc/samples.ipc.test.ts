import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { createExam, createOrder as helperCreateOrder, createPatient, createTestDb, createUser } from '../repositories/test-helpers'
import { buildGuardedHandler } from './register'
import { samplesChannels } from '@/shared/contracts'
import type { Session } from '@/shared/contracts'

const recepcionSession: Session = {
  userId: 2,
  usuario: 'recepcion1',
  nombre: 'Recepcion Uno',
  rol: 'recepcion',
  loginAt: new Date().toISOString(),
  debe_cambiar_clave: false,
}

const tecnicoSession: Session = {
  userId: 3,
  usuario: 'tec1',
  nombre: 'Tecnico Uno',
  rol: 'tecnico',
  loginAt: new Date().toISOString(),
  debe_cambiar_clave: false,
}

describe('samples:register role guard', () => {
  let testDb: Awaited<ReturnType<typeof createTestDb>>
  const writeAudit = vi.fn()

  beforeEach(async () => {
    testDb = await createTestDb()
    createUser(testDb.db, 'admin1', 'admin')
    createUser(testDb.db, 'recepcion1', 'recepcion')
    createUser(testDb.db, 'tec1', 'tecnico')
    writeAudit.mockReset()
  })

  afterEach(() => {
    testDb.cleanup()
  })

  it('blocks recepcion from registering samples and audits the attempt', async () => {
    const handler = buildGuardedHandler(
      testDb.db,
      'samples:register',
      ['admin', 'bioanalista', 'tecnico'],
      samplesChannels['samples:register'].request,
      async () => [] as never,
      { getSession: () => recepcionSession, writeAudit },
    )

    const result = await handler({}, { ordenId: 1 })

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
        despues: { channel: 'samples:register' },
      }),
    )
  })

  it('allows tecnico to invoke the handler', async () => {
    const fn = vi.fn().mockResolvedValue([] as never)
    const handler = buildGuardedHandler(
      testDb.db,
      'samples:register',
      ['admin', 'bioanalista', 'tecnico'],
      samplesChannels['samples:register'].request,
      fn,
      { getSession: () => tecnicoSession, writeAudit },
    )

    const result = await handler({}, { ordenId: 1 })

    expect(result.ok).toBe(true)
    expect(fn).toHaveBeenCalled()
  })
})

describe('samples:reject role guard', () => {
  let testDb: Awaited<ReturnType<typeof createTestDb>>
  const writeAudit = vi.fn()

  beforeEach(async () => {
    testDb = await createTestDb()
    createUser(testDb.db, 'admin1', 'admin')
    createUser(testDb.db, 'recepcion1', 'recepcion')
    writeAudit.mockReset()
  })

  afterEach(() => {
    testDb.cleanup()
  })

  it('blocks recepcion from rejecting a sample', async () => {
    const handler = buildGuardedHandler(
      testDb.db,
      'samples:reject',
      ['admin', 'bioanalista', 'tecnico'],
      samplesChannels['samples:reject'].request,
      async () => ({ id: 1 } as never),
      { getSession: () => recepcionSession, writeAudit },
    )

    const result = await handler({}, { id: 1, motivo: 'Hemólisis' })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('PERMISSION_DENIED')
    }
  })
})

describe('samples:list read access', () => {
  let testDb: Awaited<ReturnType<typeof createTestDb>>
  const writeAudit = vi.fn()

  beforeEach(async () => {
    testDb = await createTestDb()
    createUser(testDb.db, 'admin1', 'admin')
    createUser(testDb.db, 'recepcion1', 'recepcion')
    writeAudit.mockReset()
  })

  afterEach(() => {
    testDb.cleanup()
  })

  it('allows recepcion to list samples', async () => {
    const patient = createPatient(testDb.db, 'V-20000001')
    const exam = createExam(testDb.db, 'SX01', 100)
    const orderId = helperCreateOrder(testDb.db, patient, [exam])

    const fn = vi.fn().mockResolvedValue([] as never)
    const handler = buildGuardedHandler(
      testDb.db,
      'samples:list',
      ['admin', 'bioanalista', 'tecnico', 'recepcion'],
      samplesChannels['samples:list'].request,
      fn,
      { getSession: () => recepcionSession, writeAudit },
    )

    const result = await handler({}, { ordenId: orderId })

    expect(result.ok).toBe(true)
    expect(fn).toHaveBeenCalled()
  })
})
