import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { createExam, createOrder as helperCreateOrder, createPatient, createTestDb, createUser } from './test-helpers'
import { cancelPayment, getBalance, listPaymentsByOrder, recordPayment } from './payments'

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
})
