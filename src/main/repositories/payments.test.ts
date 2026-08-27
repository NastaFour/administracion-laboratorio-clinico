import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { createExam, createOrder as helperCreateOrder, createPatient, createTestDb, createUser } from './test-helpers'
import { cancelPayment, getBalance, listAllPayments, listPaymentsByOrder, recordPayment } from './payments'

describe('payments repository', () => {
  let testDb: Awaited<ReturnType<typeof createTestDb>>
  let ordenId: number
  let userId: number

  beforeEach(async () => {
    testDb = await createTestDb()
    userId = createUser(testDb.db, 'caja1', 'recepcion')
    const patient = createPatient(testDb.db, 'V-40000001')
    const exam = createExam(testDb.db, 'PX01', 1000)
    ordenId = helperCreateOrder(testDb.db, patient, [exam])
  })

  afterEach(() => {
    testDb.cleanup()
  })

  it('records a payment and updates balance', () => {
    const payment = recordPayment(testDb.db, {
      orden_id: ordenId,
      cuenta_id: null,
      metodo: 'pago_movil',
      monto_bs: 400,
      monto_usd: 0,
      tasa_bcv: 1,
      referencia: 'REF001',
      fecha: '2026-08-18',
      usuario_id: userId,
    })
    expect(payment.metodo).toBe('pago_movil')
    expect(payment.monto_bs).toBe(400)

    const balance = getBalance(testDb.db, ordenId)
    expect(balance.total_bs).toBe(1000)
    expect(balance.pagado_bs).toBe(400)
    expect(balance.saldo_bs).toBe(600)
  })

  it('lists payments for an order excluding cancelled', () => {
    recordPayment(testDb.db, {
      orden_id: ordenId,
      cuenta_id: null,
      metodo: 'efectivo',
      monto_bs: 200,
      monto_usd: 0,
      tasa_bcv: 1,
      referencia: null,
      fecha: '2026-08-18',
      usuario_id: userId,
    })
    recordPayment(testDb.db, {
      orden_id: ordenId,
      cuenta_id: null,
      metodo: 'transferencia',
      monto_bs: 300,
      monto_usd: 0,
      tasa_bcv: 1,
      referencia: 'REF002',
      fecha: '2026-08-18',
      usuario_id: userId,
    })

    const payments = listPaymentsByOrder(testDb.db, ordenId)
    expect(payments).toHaveLength(2)
  })

  it('cancels a payment', () => {
    const payment = recordPayment(testDb.db, {
      orden_id: ordenId,
      cuenta_id: null,
      metodo: 'pago_movil',
      monto_bs: 500,
      monto_usd: 0,
      tasa_bcv: 1,
      referencia: 'REF003',
      fecha: '2026-08-18',
      usuario_id: userId,
    })
    const cancelled = cancelPayment(testDb.db, payment.id, { anulado_por: userId })
    expect(cancelled.anulado).toBe(true)
    expect(cancelled.anulado_por).toBe(userId)

    const activePayments = listPaymentsByOrder(testDb.db, ordenId)
    expect(activePayments).toHaveLength(0)

    const balance = getBalance(testDb.db, ordenId)
    expect(balance.pagado_bs).toBe(0)
  })

  describe('listAllPayments', () => {
    it('returns all payments with patient and order join data', () => {
      recordPayment(testDb.db, {
        orden_id: ordenId,
        cuenta_id: null,
        metodo: 'pago_movil',
        monto_bs: 400,
        monto_usd: 10,
        tasa_bcv: 40,
        referencia: 'PM-99',
        fecha: '2026-08-20',
        usuario_id: userId,
      })

      const list = listAllPayments(testDb.db)
      expect(list).toHaveLength(1)
      expect(list[0].ordenId).toBe(ordenId)
      expect(list[0].pacienteCedula).toBe('V-40000001')
      expect(list[0].pacienteNombre).toContain('Juan')
      expect(list[0].totalOrden).toBe(1000)
      expect(list[0].saldoActualOrden).toBe(600)
      expect(list[0].metodo).toBe('pago_movil')
      expect(list[0].monto_bs).toBe(400)
      expect(list[0].cajero).toBeDefined()
    })

    it('filters by date range (desde / hasta)', () => {
      recordPayment(testDb.db, {
        orden_id: ordenId,
        cuenta_id: null,
        metodo: 'efectivo',
        monto_bs: 100,
        monto_usd: 0,
        tasa_bcv: 1,
        referencia: null,
        fecha: '2026-08-10',
        usuario_id: userId,
      })
      recordPayment(testDb.db, {
        orden_id: ordenId,
        cuenta_id: null,
        metodo: 'efectivo',
        monto_bs: 200,
        monto_usd: 0,
        tasa_bcv: 1,
        referencia: null,
        fecha: '2026-08-20',
        usuario_id: userId,
      })

      const all = listAllPayments(testDb.db)
      expect(all).toHaveLength(2)

      const august15Onwards = listAllPayments(testDb.db, { desde: '2026-08-15' })
      expect(august15Onwards).toHaveLength(1)
      expect(august15Onwards[0].monto_bs).toBe(200)

      const august15Earlier = listAllPayments(testDb.db, { hasta: '2026-08-15' })
      expect(august15Earlier).toHaveLength(1)
      expect(august15Earlier[0].monto_bs).toBe(100)
    })

    it('filters by soloDeudores and query', () => {
      // Create a second fully paid order
      const patient2 = createPatient(testDb.db, 'V-40000002')
      const exam = createExam(testDb.db, 'PX02', 500)
      const ordenId2 = helperCreateOrder(testDb.db, patient2, [exam])
      recordPayment(testDb.db, {
        orden_id: ordenId2,
        cuenta_id: null,
        metodo: 'transferencia',
        monto_bs: 500,
        monto_usd: 0,
        tasa_bcv: 1,
        referencia: 'TR-100',
        fecha: '2026-08-20',
        usuario_id: userId,
      })

      // Order 1 has 400 paid out of 1000 -> saldo 600
      recordPayment(testDb.db, {
        orden_id: ordenId,
        cuenta_id: null,
        metodo: 'efectivo',
        monto_bs: 400,
        monto_usd: 0,
        tasa_bcv: 1,
        referencia: null,
        fecha: '2026-08-20',
        usuario_id: userId,
      })

      const deudores = listAllPayments(testDb.db, { soloDeudores: true })
      expect(deudores).toHaveLength(1)
      expect(deudores[0].ordenId).toBe(ordenId)
      expect(deudores[0].saldoActualOrden).toBe(600)

      const queryResult = listAllPayments(testDb.db, { query: '40000002' })
      expect(queryResult).toHaveLength(1)
      expect(queryResult[0].pacienteCedula).toBe('V-40000002')
    })
  })
})
