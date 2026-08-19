import type Database from 'better-sqlite3'
import type { Balance, Payment, PaymentMethod, RecordPaymentRequest } from '@/shared/contracts'
import { toBoolean, toIsoString, toPaymentMethod } from './helpers'

export function rowToPayment(row: Record<string, unknown>): Payment {
  return {
    id: row.id as number,
    orden_id: (row.orden_id as number | null | undefined) ?? null,
    cuenta_id: (row.cuenta_id as number | null | undefined) ?? null,
    metodo: toPaymentMethod(row.metodo as string),
    monto_bs: row.monto_bs as number,
    monto_usd: row.monto_usd as number,
    tasa_bcv: row.tasa_bcv as number,
    referencia: (row.referencia as string | null | undefined) ?? null,
    fecha: (row.fecha as string).slice(0, 10),
    usuario_id: row.usuario_id as number,
    anulado: toBoolean(row.anulado as number | null | undefined),
    anulado_por: (row.anulado_por as number | null | undefined) ?? null,
    anulado_en: toIsoString(row.anulado_en) ?? null,
  }
}

export function getPayment(db: Database.Database, id: number): Payment | null {
  const row = db.prepare('SELECT * FROM pagos WHERE id = ?').get(id) as Record<string, unknown> | undefined
  return row ? rowToPayment(row) : null
}

export function listPaymentsByOrder(db: Database.Database, ordenId: number): Payment[] {
  const rows = db
    .prepare('SELECT * FROM pagos WHERE orden_id = ? AND anulado = 0 ORDER BY fecha')
    .all(ordenId) as Array<Record<string, unknown>>
  return rows.map(rowToPayment)
}

export function recordPayment(db: Database.Database, input: RecordPaymentRequest & { usuario_id: number }): Payment {
  // The current DB schema requires orden_id NOT NULL. Credit-account-only
  // payments (cuenta_id without orden_id) are blocked by this schema and must
  // be addressed in a follow-up migration.
  if (input.orden_id === null) {
    throw new Error('Payments without an order_id are not supported by the current schema')
  }
  const result = db
    .prepare(
      `INSERT INTO pagos (orden_id, cuenta_id, metodo, monto_bs, monto_usd, tasa_bcv, referencia, fecha, usuario_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.orden_id,
      input.cuenta_id,
      input.metodo,
      input.monto_bs,
      input.monto_usd,
      input.tasa_bcv,
      input.referencia,
      input.fecha,
      input.usuario_id,
    )
  const id = Number(result.lastInsertRowid)
  const payment = getPayment(db, id)
  if (!payment) {
    throw new Error('Payment was not created')
  }
  return payment
}

export function cancelPayment(
  db: Database.Database,
  id: number,
  input: { anulado_por: number },
): Payment {
  db.prepare('UPDATE pagos SET anulado = 1, anulado_por = ?, anulado_en = CURRENT_TIMESTAMP WHERE id = ?').run(
    input.anulado_por,
    id,
  )
  const payment = getPayment(db, id)
  if (!payment) {
    throw new Error('Payment not found after cancellation')
  }
  return payment
}

export function getBalance(db: Database.Database, ordenId: number): Balance {
  const orderRow = db.prepare('SELECT precio_total FROM ordenes WHERE id = ?').get(ordenId) as
    | { precio_total: number }
    | undefined
  const totalBs = orderRow?.precio_total ?? 0
  const pagadoRow = db
    .prepare('SELECT COALESCE(SUM(monto_bs), 0) as pagado_bs, COALESCE(SUM(monto_usd), 0) as pagado_usd FROM pagos WHERE orden_id = ? AND anulado = 0')
    .get(ordenId) as { pagado_bs: number; pagado_usd: number }
  return {
    orden_id: ordenId,
    total_bs: totalBs,
    pagado_bs: pagadoRow.pagado_bs,
    saldo_bs: Math.max(0, totalBs - pagadoRow.pagado_bs),
    total_usd: 0,
    pagado_usd: pagadoRow.pagado_usd,
    saldo_usd: Math.max(0, -pagadoRow.pagado_usd),
  }
}

export function getPaymentMethodTotals(
  db: Database.Database,
  fecha: string,
): Record<PaymentMethod, { bs: number; usd: number }> {
  const rows = db
    .prepare(
      `SELECT metodo, COALESCE(SUM(monto_bs), 0) as bs, COALESCE(SUM(monto_usd), 0) as usd
       FROM pagos WHERE date(fecha) = ? AND anulado = 0 GROUP BY metodo`,
    )
    .all(fecha) as Array<{ metodo: string; bs: number; usd: number }>
  const totals: Record<PaymentMethod, { bs: number; usd: number }> = {
    pago_movil: { bs: 0, usd: 0 },
    transferencia: { bs: 0, usd: 0 },
    punto: { bs: 0, usd: 0 },
    efectivo: { bs: 0, usd: 0 },
    mixto: { bs: 0, usd: 0 },
  }
  for (const row of rows) {
    totals[toPaymentMethod(row.metodo)] = { bs: row.bs, usd: row.usd }
  }
  return totals
}
