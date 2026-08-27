import type Database from 'better-sqlite3'
import type { Balance, ListAllPaymentsRequest, Payment, PaymentListItem, PaymentMethod, RecordPaymentRequest } from '@/shared/contracts'
import { toBoolean, toIsoString, toLocalDateIso, toPaymentMethod } from './helpers'
import { round2 } from '../services/payments'

export function rowToPayment(row: Record<string, unknown>): Payment {
  return {
    id: row.id as number,
    orden_id: row.orden_id as number,
    cuenta_id: (row.cuenta_id as number | null | undefined) ?? null,
    metodo: toPaymentMethod(row.metodo as string),
    monto_bs: row.monto_bs as number,
    monto_usd: row.monto_usd as number,
    tasa_bcv: row.tasa_bcv as number,
    referencia: (row.referencia as string | null | undefined) ?? null,
    fecha: toLocalDateIso(row.fecha) ?? (row.fecha as string).slice(0, 10),
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
      input.tasa_bcv ?? 0,
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
    total_bs: round2(totalBs),
    pagado_bs: round2(pagadoRow.pagado_bs),
    saldo_bs: round2(Math.max(0, totalBs - pagadoRow.pagado_bs)),
    // Orders are priced in Bs only (D7); USD payments already fold their Bs
    // equivalent into monto_bs, so there is no USD-denominated order balance.
    total_usd: 0,
    pagado_usd: round2(pagadoRow.pagado_usd),
    saldo_usd: 0,
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

export function listAllPayments(
  db: Database.Database,
  filters: ListAllPaymentsRequest = {},
): PaymentListItem[] {
  const conditions: string[] = ['o.anulada = 0']
  const params: unknown[] = []

  if (filters.desde) {
    conditions.push('date(p.fecha) >= date(?)')
    params.push(filters.desde)
  }

  if (filters.hasta) {
    conditions.push('date(p.fecha) <= date(?)')
    params.push(filters.hasta)
  }

  if (filters.soloDeudores) {
    conditions.push('(o.precio_total - COALESCE(pagos_totales.total_pagado, 0)) > 0.009')
  }

  if (filters.query && filters.query.trim().length > 0) {
    const q = `%${filters.query.trim()}%`
    conditions.push('(pac.cedula LIKE ? OR (pac.nombres || \' \' || pac.apellidos) LIKE ? OR CAST(p.orden_id AS TEXT) LIKE ? OR p.referencia LIKE ?)')
    params.push(q, q, q, q)
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const query = `
    SELECT 
      p.id,
      p.orden_id AS ordenId,
      o.paciente_id AS pacienteId,
      (pac.nombres || ' ' || pac.apellidos) AS pacienteNombre,
      pac.cedula AS pacienteCedula,
      p.metodo,
      p.monto_bs,
      p.monto_usd,
      p.tasa_bcv,
      p.fecha,
      COALESCE(u.nombre_completo, u.username, 'Sistema') AS cajero,
      o.precio_total AS totalOrden,
      p.anulado,
      ROUND(MAX(0, o.precio_total - COALESCE(pagos_totales.total_pagado, 0)), 2) AS saldoActualOrden
    FROM pagos p
    INNER JOIN ordenes o ON o.id = p.orden_id
    INNER JOIN pacientes pac ON pac.id = o.paciente_id
    LEFT JOIN usuarios u ON u.id = p.usuario_id
    LEFT JOIN (
      SELECT orden_id, SUM(monto_bs) as total_pagado
      FROM pagos
      WHERE anulado = 0
      GROUP BY orden_id
    ) pagos_totales ON pagos_totales.orden_id = o.id
    ${whereClause}
    ORDER BY date(p.fecha) DESC, p.id DESC
  `

  const rows = db.prepare(query).all(...params) as Array<Record<string, unknown>>

  return rows.map((row) => ({
    id: row.id as number,
    ordenId: row.ordenId as number,
    pacienteId: row.pacienteId as number,
    pacienteNombre: row.pacienteNombre as string,
    pacienteCedula: row.pacienteCedula as string,
    metodo: toPaymentMethod(row.metodo as string),
    monto_bs: round2(row.monto_bs as number),
    monto_usd: round2(row.monto_usd as number),
    tasa_bcv: round2(row.tasa_bcv as number),
    fecha: toLocalDateIso(row.fecha) ?? (row.fecha as string).slice(0, 10),
    cajero: row.cajero as string,
    totalOrden: round2(row.totalOrden as number),
    saldoActualOrden: round2(row.saldoActualOrden as number),
    anulado: toBoolean(row.anulado as number | null | undefined),
  }))
}
