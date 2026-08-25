import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { createExam, createOrder as helperCreateOrder, createPatient, createTestDb, createUser } from '../repositories/test-helpers'
import { buildGuardedHandler } from './register'
import { paymentsChannels, ERROR_CODES, PAYMENT_METHOD, type Session } from '@/shared/contracts'
import { setBcvRate } from '../repositories/config'
import {
  handleBalance,
  handleCancelPayment,
  handleGetBcvRate,
  handleListPaymentsForOrder,
  handlePrintCierre,
  handleRecordPayment,
  handleRunCierre,
  handleSetBcvRate,
  registerPaymentsHandlers,
} from './payments.ipc'

vi.mock('electron', () => ({
  ipcMain: { handle: vi.fn() },
}))

function makeSession(role: Session['rol'], userId: number): Session {
  return {
    userId,
    usuario: `user${userId}`,
    nombre: 'Usuario',
    rol: role,
    loginAt: new Date().toISOString(),
    debe_cambiar_clave: false,
  }
}

describe('payments IPC', () => {
  let testDb: Awaited<ReturnType<typeof createTestDb>>
  let recepcionId: number
  let adminId: number
  let ordenId: number

  beforeEach(async () => {
    testDb = await createTestDb()
    recepcionId = createUser(testDb.db, 'caja1', 'recepcion')
    adminId = createUser(testDb.db, 'adm1', 'admin')
    const patient = createPatient(testDb.db, 'V-60000001')
    const exam = createExam(testDb.db, 'PAY01', 10000)
    ordenId = helperCreateOrder(testDb.db, patient, [exam])
  })

  afterEach(() => {
    testDb.cleanup()
  })

  describe('role guards', () => {
    it('blocks a tecnico from recording payments and audits the denial', async () => {
      const writeAudit = vi.fn()
      const handler = buildGuardedHandler(
        testDb.db,
        'payments:record',
        ['admin', 'recepcion'],
        paymentsChannels['payments:record'].request,
        async () => ({ id: 1 }) as never,
        { getSession: () => makeSession('tecnico', 9), writeAudit },
      )
      const result = await handler({}, {
        orden_id: ordenId,
        metodo: PAYMENT_METHOD.EFECTIVO,
        monto_bs: 100,
        fecha: '2026-08-18T12:00:00.000Z',
      })
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error.code).toBe('PERMISSION_DENIED')
      expect(writeAudit).toHaveBeenCalledWith(
        testDb.db,
        expect.objectContaining({ accion: 'permiso.denegado', despues: { channel: 'payments:record' } }),
      )
    })

    it('blocks a recepcion from setting the BCV rate (admin only)', async () => {
      const writeAudit = vi.fn()
      const handler = buildGuardedHandler(
        testDb.db,
        'config:setBcvRate',
        ['admin'],
        paymentsChannels['config:setBcvRate'].request,
        async () => ({ tasa: 1, actualizado_en: '' }) as never,
        { getSession: () => makeSession('recepcion', recepcionId), writeAudit },
      )
      const result = await handler({}, { tasa: 950 })
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error.code).toBe('PERMISSION_DENIED')
    })
  })

  describe('record + rate resolution', () => {
    it('RED: a USD payment converts using the active rate from history', async () => {
      setBcvRate(testDb.db, 950, adminId)
      const payment = await handleRecordPayment(
        testDb.db,
        { orden_id: ordenId, cuenta_id: null, metodo: PAYMENT_METHOD.TRANSFERENCIA, monto_bs: 0, monto_usd: 10, referencia: 'USD-1', fecha: '2026-08-18T12:00:00.000Z' },
        makeSession('recepcion', recepcionId),
      )
      expect(payment.monto_bs).toBe(9500)
      expect(payment.monto_usd).toBe(10)
      expect(payment.tasa_bcv).toBe(950)
    })

    it('RED: a missing rate blocks a USD payment with MISSING_BCV_RATE', async () => {
      await expect(
        handleRecordPayment(
          testDb.db,
          { orden_id: ordenId, cuenta_id: null, metodo: PAYMENT_METHOD.TRANSFERENCIA, monto_bs: 0, monto_usd: 10, referencia: null, fecha: '2026-08-18T12:00:00.000Z' },
          makeSession('recepcion', recepcionId),
        ),
      ).rejects.toThrow(ERROR_CODES.MISSING_BCV_RATE)
    })

    it('records a Bs-only payment without a rate and audits pago.registrado', async () => {
      const payment = await handleRecordPayment(
        testDb.db,
        { orden_id: ordenId, cuenta_id: null, metodo: PAYMENT_METHOD.EFECTIVO, monto_bs: 400, monto_usd: 0, referencia: null, fecha: '2026-08-18T12:00:00.000Z' },
        makeSession('recepcion', recepcionId),
      )
      expect(payment.monto_bs).toBe(400)
      const audit = testDb.db
        .prepare("SELECT accion FROM auditoria WHERE entidad = 'pago' AND entidad_id = ?")
        .get(payment.id) as { accion: string } | undefined
      expect(audit?.accion).toBe('pago.registrado')
    })
  })

  describe('cancel, list, balance, bcv', () => {
    it('cancels a payment and audits pago.anulado with the motive', async () => {
      const payment = await handleRecordPayment(
        testDb.db,
        { orden_id: ordenId, cuenta_id: null, metodo: PAYMENT_METHOD.EFECTIVO, monto_bs: 400, monto_usd: 0, referencia: null, fecha: '2026-08-18T12:00:00.000Z' },
        makeSession('recepcion', recepcionId),
      )
      const cancelled = await handleCancelPayment(
        testDb.db,
        { id: payment.id, motivo: 'Error de registro' },
        makeSession('recepcion', recepcionId),
      )
      expect(cancelled.anulado).toBe(true)

      const list = handleListPaymentsForOrder(testDb.db, { ordenId })
      expect(list).toHaveLength(0)

      const audit = testDb.db
        .prepare("SELECT despues FROM auditoria WHERE entidad = 'pago' AND entidad_id = ? AND accion = 'pago.anulado'")
        .get(payment.id) as { despues: string } | undefined
      expect(audit?.despues).toBeDefined()
      expect(JSON.parse(audit?.despues ?? '{}')).toMatchObject({ anulado: true, motivo: 'Error de registro' })
    })

    it('returns the order balance', async () => {
      await handleRecordPayment(
        testDb.db,
        { orden_id: ordenId, cuenta_id: null, metodo: PAYMENT_METHOD.EFECTIVO, monto_bs: 400, monto_usd: 0, referencia: null, fecha: '2026-08-18T12:00:00.000Z' },
        makeSession('recepcion', recepcionId),
      )
      const balance = handleBalance(testDb.db, { ordenId })
      expect(balance.total_bs).toBe(10000)
      expect(balance.pagado_bs).toBe(400)
      expect(balance.saldo_bs).toBe(9600)
    })

    it('getBcvRate returns null before any rate and the active rate after', async () => {
      expect(handleGetBcvRate(testDb.db)).toBeNull()
      await handleSetBcvRate(testDb.db, { tasa: 955 }, makeSession('admin', adminId))
      expect(handleGetBcvRate(testDb.db)?.tasa).toBe(955)

      const count = testDb.db.prepare('SELECT COUNT(*) as count FROM bcv_historial').get() as { count: number }
      expect(count.count).toBe(1)
    })

    it('setBcvRate appends to history (never overwrites) and audits config.cambiada', async () => {
      await handleSetBcvRate(testDb.db, { tasa: 950 }, makeSession('admin', adminId))
      await handleSetBcvRate(testDb.db, { tasa: 960 }, makeSession('admin', adminId))

      const count = testDb.db.prepare('SELECT COUNT(*) as count FROM bcv_historial').get() as { count: number }
      expect(count.count).toBe(2)
      expect(handleGetBcvRate(testDb.db)?.tasa).toBe(960)

      const audit = testDb.db
        .prepare("SELECT COUNT(*) as count FROM auditoria WHERE accion = 'config.cambiada'")
        .get() as { count: number }
      expect(audit.count).toBe(2)
    })
  })

  describe('cierre handlers', () => {
    it('runs the cierre and returns a printable receipt', async () => {
      await handleRecordPayment(
        testDb.db,
        { orden_id: ordenId, cuenta_id: null, metodo: PAYMENT_METHOD.EFECTIVO, monto_bs: 400, monto_usd: 0, referencia: null, fecha: '2026-08-18T12:00:00.000Z' },
        makeSession('recepcion', recepcionId),
      )
      const cierre = await handleRunCierre(
        testDb.db,
        { fecha: '2026-08-18' },
        makeSession('recepcion', recepcionId),
      )
      expect(cierre.total_bs).toBe(400)

      const html = handlePrintCierre(testDb.db, { fecha: '2026-08-18' })
      expect(html).toContain('Cierre de Caja')
      expect(html).toContain('400,00')
    })
  })

  describe('registration', () => {
    it('registerPaymentsHandlers registers every payments + bcv + cierre channel', async () => {
      const { ipcMain } = await import('electron')
      const handleSpy = vi.mocked(ipcMain.handle)
      handleSpy.mockClear()
      registerPaymentsHandlers(testDb.db)
      const expectedChannels = Object.keys(paymentsChannels)
      expect(handleSpy).toHaveBeenCalledTimes(expectedChannels.length)
      for (const channel of expectedChannels) {
        expect(handleSpy).toHaveBeenCalledWith(channel, expect.any(Function))
      }
    })
  })
})
