import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { createExam, createOrder as helperCreateOrder, createPatient, createTestDb, createUser } from '../repositories/test-helpers'
import { recordPayment } from '../repositories/payments'
import { setBcvRate } from '../repositories/config'
import { listCierres } from '../repositories/cierre'
import { cierrePrintService, consolidateCierre, getCierreMetrics, runCierreService } from './cierre'
import { PAYMENT_METHOD, type Session } from '@/shared/contracts'

const DATE = '2026-08-18'

function makeSession(userId: number): Session {
  return {
    userId,
    usuario: 'caja1',
    nombre: 'Cajero',
    rol: 'recepcion',
    loginAt: new Date().toISOString(),
    debe_cambiar_clave: false,
  }
}

describe('cierre service', () => {
  let testDb: Awaited<ReturnType<typeof createTestDb>>
  let userId: number
  let ordenId: number

  beforeEach(async () => {
    testDb = await createTestDb()
    userId = createUser(testDb.db, 'caja1', 'recepcion')
    const patient = createPatient(testDb.db, 'V-50000001')
    const exam = createExam(testDb.db, 'CIERRE01', 10000)
    ordenId = helperCreateOrder(testDb.db, patient, [exam])
  })

  afterEach(() => {
    testDb.cleanup()
  })

  function seedPayments(): void {
    // pagos.fecha is the LOCAL business day (date-only), matching production.
    recordPayment(testDb.db, {
      orden_id: ordenId,
      cuenta_id: null,
      metodo: PAYMENT_METHOD.PAGO_MOVIL,
      monto_bs: 1000,
      monto_usd: 0,
      fecha: DATE,
      referencia: null,
      usuario_id: userId,
    })
    recordPayment(testDb.db, {
      orden_id: ordenId,
      cuenta_id: null,
      metodo: PAYMENT_METHOD.EFECTIVO,
      monto_bs: 2000,
      monto_usd: 0,
      fecha: DATE,
      referencia: null,
      usuario_id: userId,
    })
    // 10 USD @ 950 → stored as monto_bs 9500
    recordPayment(testDb.db, {
      orden_id: ordenId,
      cuenta_id: null,
      metodo: PAYMENT_METHOD.TRANSFERENCIA,
      monto_bs: 9500,
      monto_usd: 10,
      tasa_bcv: 950,
      fecha: DATE,
      referencia: null,
      usuario_id: userId,
    })
  }

  it('RED: consolidated totals match the individual payments by method', () => {
    seedPayments()

    const consolidation = consolidateCierre(testDb.db, DATE)

    expect(consolidation.total_bs).toBe(12500)
    expect(consolidation.total_usd).toBe(10)
    expect(consolidation.detalle_por_metodo[PAYMENT_METHOD.PAGO_MOVIL]).toEqual({ bs: 1000, usd: 0 })
    expect(consolidation.detalle_por_metodo[PAYMENT_METHOD.EFECTIVO]).toEqual({ bs: 2000, usd: 0 })
    expect(consolidation.detalle_por_metodo[PAYMENT_METHOD.TRANSFERENCIA]).toEqual({ bs: 9500, usd: 10 })
    expect(consolidation.detalle_por_metodo[PAYMENT_METHOD.PUNTO]).toEqual({ bs: 0, usd: 0 })
    expect(consolidation.detalle_por_metodo[PAYMENT_METHOD.MIXTO]).toEqual({ bs: 0, usd: 0 })
  })

  it('RED: a payment on its business day consolidates under that exact date (C3 regression)', () => {
    // pagos.fecha IS the local business day (date-only). A payment recorded on
    // 2026-09-30 must consolidate under '2026-09-30' — never shifted to the
    // previous day by timezone math.
    recordPayment(testDb.db, {
      orden_id: ordenId,
      cuenta_id: null,
      metodo: PAYMENT_METHOD.EFECTIVO,
      monto_bs: 700,
      monto_usd: 0,
      fecha: '2026-09-30',
      referencia: null,
      usuario_id: userId,
    })
    const consolidation = consolidateCierre(testDb.db, '2026-09-30')
    expect(consolidation.total_bs).toBe(700)
  })

  it('excludes cancelled payments from the cierre', () => {
    const cancelled = recordPayment(testDb.db, {
      orden_id: ordenId,
      cuenta_id: null,
      metodo: PAYMENT_METHOD.EFECTIVO,
      monto_bs: 500,
      monto_usd: 0,
      fecha: DATE,
      referencia: null,
      usuario_id: userId,
    })
    testDb.db.prepare('UPDATE pagos SET anulado = 1, anulado_por = ?, anulado_en = CURRENT_TIMESTAMP WHERE id = ?').run(userId, cancelled.id)

    const consolidation = consolidateCierre(testDb.db, DATE)
    expect(consolidation.total_bs).toBe(0)
  })

  it('runs the cierre, persists it, surfaces the rate last-updated date, and audits', async () => {
    setBcvRate(testDb.db, 950, userId)
    seedPayments()

    const cierre = await runCierreService(testDb.db, DATE, makeSession(userId))

    expect(cierre.fecha).toBe(DATE)
    expect(cierre.total_bs).toBe(12500)
    expect(cierre.total_usd).toBe(10)
    expect(cierre.tasa_bcv).toBe(950)
    expect(cierre.tasa_actualizado_en).not.toBeNull()

    const persisted = testDb.db.prepare('SELECT * FROM cierre_caja WHERE fecha = ?').get(DATE) as Record<string, unknown>
    expect(persisted).toBeDefined()
    expect(persisted.total_bs).toBe(12500)

    const audit = testDb.db
      .prepare("SELECT accion, entidad FROM auditoria WHERE accion = 'cierre.ejecutado'")
      .get() as { accion: string; entidad: string } | undefined
    expect(audit?.accion).toBe('cierre.ejecutado')
    expect(audit?.entidad).toBe('cierre')
  })

  it('running the cierre twice upserts instead of failing on UNIQUE(fecha)', async () => {
    seedPayments()
    await runCierreService(testDb.db, DATE, makeSession(userId))
    await expect(runCierreService(testDb.db, DATE, makeSession(userId))).resolves.toBeDefined()

    const count = testDb.db.prepare('SELECT COUNT(*) as count FROM cierre_caja WHERE fecha = ?').get(DATE) as { count: number }
    expect(count.count).toBe(1)
  })

  it('produces a printable receipt containing totals and the rate last-updated', () => {
    setBcvRate(testDb.db, 950, userId)
    seedPayments()

    const html = cierrePrintService(testDb.db, DATE)
    expect(html).toContain('Cierre de Caja')
    expect(html).toContain('12.500,00')
    expect(html).toContain('10,00')
    expect(html).toContain('Última actualización de la tasa')
  })

  it('blocks nothing: cierre runs with zero payments and a missing rate (rate is informational)', async () => {
    const cierre = await runCierreService(testDb.db, DATE, makeSession(userId))
    expect(cierre.total_bs).toBe(0)
    expect(cierre.tasa_bcv).toBe(0)
    expect(cierre.tasa_actualizado_en).toBeNull()
  })

  it('calculates live accumulated metrics for dia, semana, mes, and anio', () => {
    setBcvRate(testDb.db, 950, userId)
    seedPayments() // On 2026-08-18 (Tuesday of week Aug 17-23, month Aug, year 2026): 12500 Bs, 10 USD

    // Record another payment on a different day of the same week (2026-08-19 Wednesday)
    recordPayment(testDb.db, {
      orden_id: ordenId,
      cuenta_id: null,
      metodo: PAYMENT_METHOD.EFECTIVO,
      monto_bs: 3000,
      monto_usd: 0,
      fecha: '2026-08-19',
      referencia: null,
      usuario_id: userId,
    })

    // Record payment in another month of the same year (2026-07-15)
    recordPayment(testDb.db, {
      orden_id: ordenId,
      cuenta_id: null,
      metodo: PAYMENT_METHOD.EFECTIVO,
      monto_bs: 5000,
      monto_usd: 5,
      fecha: '2026-07-15',
      referencia: null,
      usuario_id: userId,
    })

    const metrics = getCierreMetrics(testDb.db, '2026-08-18')

    // dia (only 2026-08-18)
    expect(metrics.dia.bs).toBe(12500)
    expect(metrics.dia.usd).toBe(10)

    // semana (2026-08-17 to 2026-08-23: includes 18th and 19th)
    expect(metrics.semana.bs).toBe(15500)
    expect(metrics.semana.usd).toBe(10)

    // mes (August 2026: includes 18th and 19th)
    expect(metrics.mes.bs).toBe(15500)
    expect(metrics.mes.usd).toBe(10)

    // anio (2026: includes Aug 18th, Aug 19th, and July 15th)
    expect(metrics.anio.bs).toBe(20500)
    expect(metrics.anio.usd).toBe(15)
  })

  it('lists persisted cierres with user details ordered DESC', async () => {
    seedPayments()
    await runCierreService(testDb.db, '2026-08-17', makeSession(userId))
    await runCierreService(testDb.db, '2026-08-18', makeSession(userId))

    const list = listCierres(testDb.db)
    expect(list).toHaveLength(2)
    expect(list[0].fecha).toBe('2026-08-18')
    expect(list[1].fecha).toBe('2026-08-17')
    expect(list[0].cerrado_por).toBeDefined()
    expect(list[0].detalle_por_metodo).toBeDefined()

    const filtered = listCierres(testDb.db, { desde: '2026-08-18' })
    expect(filtered).toHaveLength(1)
    expect(filtered[0].fecha).toBe('2026-08-18')
  })
})
