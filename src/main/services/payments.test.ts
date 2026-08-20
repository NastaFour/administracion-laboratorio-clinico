import { describe, expect, it } from 'vitest'
import { ERROR_CODES, PAYMENT_METHOD } from '@/shared/contracts'
import {
  PAYMENT_METHODS,
  assertDeliverable,
  canDeliverOrder,
  computeBalance,
  resolveBsAmount,
  round2,
  usdToBs,
} from './payments'

describe('payments pure module — method catalog', () => {
  it('exposes all five payment methods in display order', () => {
    expect(PAYMENT_METHODS).toEqual([
      PAYMENT_METHOD.PAGO_MOVIL,
      PAYMENT_METHOD.TRANSFERENCIA,
      PAYMENT_METHOD.PUNTO,
      PAYMENT_METHOD.EFECTIVO,
      PAYMENT_METHOD.MIXTO,
    ])
  })
})

describe('payments pure module — currency math', () => {
  it('rounds to two decimals without float drift', () => {
    expect(round2(0.1 + 0.2)).toBe(0.3)
    expect(round2(1.005)).toBe(1.01)
  })

  it('converts USD to Bs at the given rate', () => {
    expect(usdToBs(10, 950)).toBe(9500)
    expect(usdToBs(1.5, 950)).toBe(1425)
  })
})

describe('payments pure module — resolveBsAmount', () => {
  it('returns the raw Bs amount unchanged for a Bs-only payment', () => {
    expect(resolveBsAmount({ monto_bs: 400, monto_usd: 0, tasaBcv: null })).toBe(400)
  })

  it('RED: a USD payment converts using the active rate (10 USD @ 950 → 9500 Bs)', () => {
    expect(resolveBsAmount({ monto_bs: 0, monto_usd: 10, tasaBcv: 950 })).toBe(9500)
  })

  it('RED: a missing rate blocks a USD payment (no silent fallback)', () => {
    expect(() => resolveBsAmount({ monto_bs: 0, monto_usd: 10, tasaBcv: null })).toThrow(
      ERROR_CODES.MISSING_BCV_RATE,
    )
    expect(() => resolveBsAmount({ monto_bs: 0, monto_usd: 10, tasaBcv: 0 })).toThrow(
      ERROR_CODES.MISSING_BCV_RATE,
    )
    expect(() => resolveBsAmount({ monto_bs: 0, monto_usd: 5, tasaBcv: -1 })).toThrow(
      ERROR_CODES.MISSING_BCV_RATE,
    )
  })

  it('combines Bs and converted USD for a mixed payment', () => {
    // 100 Bs cash + 10 USD @ 950 = 100 + 9500 = 9600 Bs
    expect(resolveBsAmount({ monto_bs: 100, monto_usd: 10, tasaBcv: 950 })).toBe(9600)
  })
})

describe('payments pure module — balance math', () => {
  it('RED: 400 Bs on a 1000 Bs order leaves a 600 Bs balance', () => {
    const balance = computeBalance(1000, [{ monto_bs: 400 }])
    expect(balance.pagado_bs).toBe(400)
    expect(balance.saldo_bs).toBe(600)
  })

  it('sums multiple abonos against the total', () => {
    const balance = computeBalance(1000, [{ monto_bs: 300 }, { monto_bs: 200 }, { monto_bs: 250 }])
    expect(balance.pagado_bs).toBe(750)
    expect(balance.saldo_bs).toBe(250)
  })

  it('returns the full total as balance when no payments exist', () => {
    const balance = computeBalance(1000, [])
    expect(balance.pagado_bs).toBe(0)
    expect(balance.saldo_bs).toBe(1000)
  })

  it('clamps the balance at zero on overpayment', () => {
    const balance = computeBalance(1000, [{ monto_bs: 1200 }])
    expect(balance.saldo_bs).toBe(0)
  })

  it('a USD payment (already converted) reduces the Bs balance', () => {
    // 10 USD @ 950 was stored as monto_bs 9500; order total 10000 Bs
    const balance = computeBalance(10000, [{ monto_bs: 9500 }])
    expect(balance.saldo_bs).toBe(500)
  })
})

describe('payments pure module — delivery gate', () => {
  it('blocks delivery while a balance is pending and the order is not on credit', () => {
    const decision = canDeliverOrder({ credito: false }, { saldo_bs: 600 })
    expect(decision.allowed).toBe(false)
    expect(decision.reason).toBe(ERROR_CODES.PENDING_BALANCE)
  })

  it('RED: an authorized credit account (credito=1) is allowed to deliver', () => {
    const decision = canDeliverOrder({ credito: true }, { saldo_bs: 600 })
    expect(decision.allowed).toBe(true)
  })

  it('a credit account is allowed to deliver even at a zero balance', () => {
    expect(canDeliverOrder({ credito: true }, { saldo_bs: 0 }).allowed).toBe(true)
  })

  it('allows delivery when the balance is fully settled', () => {
    expect(canDeliverOrder({ credito: false }, { saldo_bs: 0 }).allowed).toBe(true)
  })

  it('assertDeliverable throws PENDING_BALANCE when blocked', () => {
    expect(() => assertDeliverable({ credito: false }, { saldo_bs: 1 })).toThrow(
      ERROR_CODES.PENDING_BALANCE,
    )
    expect(() => assertDeliverable({ credito: true }, { saldo_bs: 1 })).not.toThrow()
  })
})
