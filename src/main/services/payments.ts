import type { PaymentMethod } from '@/shared/contracts'
import { ERROR_CODES, PAYMENT_METHOD } from '@/shared/contracts'

/**
 * Payment domain logic (pure module — no database, no side effects).
 *
 * The payment model is dual-currency (Bs/USD) with a manually-entered offline
 * BCV rate. Orders are priced in Bs only; a USD payment contributes its Bs
 * equivalent (monto_usd × tasa_bcv) toward the order balance. `pagos.monto_bs`
 * therefore stores the *total* Bs value of a payment (including any converted
 * USD portion), while `pagos.monto_usd` stores the raw USD amount for the
 * cierre's USD totals.
 */

/** Every supported payment method, in display order. */
export const PAYMENT_METHODS: readonly PaymentMethod[] = [
  PAYMENT_METHOD.PAGO_MOVIL,
  PAYMENT_METHOD.TRANSFERENCIA,
  PAYMENT_METHOD.PUNTO,
  PAYMENT_METHOD.EFECTIVO,
  PAYMENT_METHOD.MIXTO,
]

/** Round a monetary amount to two decimals (avoids float drift in Zod 0.01 checks). */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

/** Convert a USD amount to its Bs equivalent at the given BCV rate. */
export function usdToBs(montoUsd: number, tasaBcv: number): number {
  return round2(montoUsd * tasaBcv)
}

/**
 * Resolve the total Bs value of a payment from its raw Bs and USD components.
 *
 * A USD component requires an active BCV rate (from history); a missing rate
 * blocks the payment with MISSING_BCV_RATE — there is no silent fallback rate.
 */
export function resolveBsAmount(input: {
  monto_bs: number
  monto_usd: number
  tasaBcv: number | null
}): number {
  if (input.monto_usd > 0) {
    if (input.tasaBcv === null || input.tasaBcv <= 0) {
      throw new Error(ERROR_CODES.MISSING_BCV_RATE)
    }
    return round2(input.monto_bs + usdToBs(input.monto_usd, input.tasaBcv))
  }
  return round2(input.monto_bs)
}

/**
 * Compute the paid balance against an order's Bs total given its active
 * payments (whose `monto_bs` already includes any converted USD portion).
 */
export function computeBalance(
  totalBs: number,
  payments: Array<{ monto_bs: number }>,
): { pagado_bs: number; saldo_bs: number } {
  const pagado = round2(payments.reduce((sum, payment) => sum + payment.monto_bs, 0))
  return {
    pagado_bs: pagado,
    saldo_bs: round2(Math.max(0, totalBs - pagado)),
  }
}

export interface DeliveryDecision {
  allowed: boolean
  reason?: string
}

/**
 * Delivery gate: an order may not be delivered while a balance is pending,
 * EXCEPT when the order is an authorized credit account (`ordenes.credito = 1`,
 * authorized via the WU7 `orders:authorizeCredit` channel).
 */
export function canDeliverOrder(
  order: { credito: boolean },
  balance: { saldo_bs: number },
): DeliveryDecision {
  if (order.credito) {
    return { allowed: true }
  }
  if (balance.saldo_bs > 0) {
    return { allowed: false, reason: ERROR_CODES.PENDING_BALANCE }
  }
  return { allowed: true }
}

/** Throws PENDING_BALANCE when delivery must be blocked. */
export function assertDeliverable(order: { credito: boolean }, balance: { saldo_bs: number }): void {
  const decision = canDeliverOrder(order, balance)
  if (!decision.allowed) {
    throw new Error(ERROR_CODES.PENDING_BALANCE)
  }
}
