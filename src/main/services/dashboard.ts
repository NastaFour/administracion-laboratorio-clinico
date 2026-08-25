/**
 * WU12 — real dashboard aggregates (D10 / M11.1).
 *
 * Every KPI is computed from parameterized SQL over the live database — no
 * fabricated or fallback numbers ever (M11.4). The four views map to:
 *   dashboard:today    → getTodayKpis  (orders/revenue/pending/categories)
 *   dashboard:debtors  → getDebtors    (aging buckets 0-30/31-60/61-90/90+)
 *   dashboard:stats    → getStats      (top exams + monthly revenue vs prev)
 *   dashboard:trends   → getTrends     (per-patient numeric analyte series)
 *
 * The module is pure main-process code (no Electron imports) so it runs under
 * Vitest with a temp-file DB.
 */

import type Database from 'better-sqlite3'
import type { DebtorBucket, ExamStat, MonthlyRevenue, PatientAnalyte, Stats, TodayKpi, Trend } from '@/shared/contracts'
import { round2 } from './payments'

export type DebtorBucketRange = DebtorBucket['rango']

/** Local (not UTC) YYYY-MM-DD for the current date — dashboard defaults. */
export function localDateIso(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function previousMonthKey(desde: string): string {
  const [year, month] = desde.split('-').map(Number)
  if (!year || !month) {
    return desde.slice(0, 7)
  }
  const prev = new Date(Date.UTC(year, month - 2, 1))
  return `${prev.getUTCFullYear()}-${String(prev.getUTCMonth() + 1).padStart(2, '0')}`
}

// ---------------------------------------------------------------------------
// dashboard:today
// ---------------------------------------------------------------------------

/**
 * KPIs for one day (defaults to today): orders created (non-anulada), revenue
 * collected that day (Bs + USD from non-cancelled payments), results still
 * awaiting validation (Pendiente/Capturado — a lab-wide workload number), and
 * ordered-exam counts by catalog category.
 */
export function getTodayKpis(db: Database.Database, fecha?: string): TodayKpi {
  const day = fecha ?? localDateIso()

  const ordersToday = db
    .prepare('SELECT COUNT(*) AS n FROM ordenes WHERE date(fecha_solicitud, \'localtime\') = ? AND anulada = 0')
    .get(day) as { n: number }

  const revenueToday = db
    .prepare(
      // pagos.fecha is a LOCAL date-only business day (D5) — plain date read,
      // never shifted with 'localtime' (that would drop UTC-4 nights back a day).
      'SELECT COALESCE(SUM(monto_bs), 0) AS bs, COALESCE(SUM(monto_usd), 0) AS usd FROM pagos WHERE date(fecha) = ? AND anulado = 0',
    )
    .get(day) as { bs: number; usd: number }

  const pendingResults = db
    .prepare("SELECT COUNT(*) AS n FROM resultados WHERE estatus_validacion != 'Validado'")
    .get() as { n: number }

  const byCategory = db
    .prepare(
      `SELECT ec.categoria AS categoria, COUNT(*) AS n
       FROM orden_examenes oe
       JOIN ordenes o ON o.id = oe.orden_id
       JOIN examenes_catalogo ec ON ec.id = oe.examen_id
       WHERE date(o.fecha_solicitud, 'localtime') = ? AND o.anulada = 0
       GROUP BY ec.categoria
       ORDER BY ec.categoria`,
    )
    .all(day) as Array<{ categoria: string; n: number }>

  const examenesPorCategoria: TodayKpi['examenes_por_categoria'] = {}
  for (const row of byCategory) {
    examenesPorCategoria[row.categoria] = row.n
  }

  return {
    ordenes_hoy: ordersToday.n,
    resultados_pendientes: pendingResults.n,
    ingreso_bs: round2(revenueToday.bs),
    ingreso_usd: round2(revenueToday.usd),
    examenes_por_categoria: examenesPorCategoria,
  }
}

// ---------------------------------------------------------------------------
// dashboard:debtors
// ---------------------------------------------------------------------------

function agingBucket(daysPending: number): DebtorBucketRange {
  if (daysPending <= 30) return '0-30'
  if (daysPending <= 60) return '31-60'
  if (daysPending <= 90) return '61-90'
  return '90+'
}

/**
 * Every non-anulada order with a positive pending balance, bucketed by how
 * many days its balance has been owed since the order date (M11.1 aging).
 * The balance is the real difference between the order total and the sum of
 * non-cancelled payments — never a stored flag.
 */
export function getDebtors(db: Database.Database, fechaCorte?: string): DebtorBucket[] {
  const corte = fechaCorte ?? localDateIso()
  const rows = db
    .prepare(
      `SELECT o.id AS orden_id, o.paciente_id, o.credito, o.precio_total,
              date(o.fecha_solicitud, 'localtime') AS fecha_local,
              p.nombres, p.apellidos,
              (SELECT COALESCE(SUM(monto_bs), 0) FROM pagos pg WHERE pg.orden_id = o.id AND pg.anulado = 0) AS pagado_bs
       FROM ordenes o
       JOIN pacientes p ON p.id = o.paciente_id
       WHERE o.anulada = 0`,
    )
    .all() as Array<{
    orden_id: number
    paciente_id: number
    credito: number
    fecha_local: string
    precio_total: number
    nombres: string
    apellidos: string
    pagado_bs: number
  }>

  const debtors: DebtorBucket[] = []
  for (const row of rows) {
    const saldoBs = round2(Math.max(0, row.precio_total - row.pagado_bs))
    if (saldoBs <= 0) {
      continue
    }
    const daysRaw = Math.floor(
      (new Date(`${corte}T00:00:00`).getTime() - new Date(`${row.fecha_local}T00:00:00`).getTime()) /
        (1000 * 60 * 60 * 24),
    )
    const diasPendientes = Math.max(0, daysRaw)
    debtors.push({
      rango: agingBucket(diasPendientes),
      paciente_id: row.paciente_id,
      paciente_nombre: `${row.apellidos}, ${row.nombres}`,
      saldo_bs: saldoBs,
      saldo_usd: 0,
      dias_pendientes: diasPendientes,
    })
  }

  // Most overdue first so the top of the list is the 90+ bucket.
  debtors.sort((a, b) => b.dias_pendientes - a.dias_pendientes)
  return debtors
}

// ---------------------------------------------------------------------------
// dashboard:stats
// ---------------------------------------------------------------------------

/**
 * Lab statistics over a date range: the most-ordered exams (count + revenue),
 * monthly revenue for every month inside the range (zero-filled so charts have
 * no gaps), and the revenue of the month immediately before the range start.
 */
export function getStats(db: Database.Database, desde: string, hasta: string): Stats {
  const topExamenes = db
    .prepare(
      `SELECT ec.id AS examen_id, ec.nombre AS examen_nombre, COUNT(*) AS cantidad, COALESCE(SUM(oe.precio), 0) AS ingreso_bs
       FROM orden_examenes oe
       JOIN ordenes o ON o.id = oe.orden_id
       JOIN examenes_catalogo ec ON ec.id = oe.examen_id
       WHERE date(o.fecha_solicitud, 'localtime') BETWEEN ? AND ? AND o.anulada = 0
       GROUP BY ec.id, ec.nombre
       ORDER BY cantidad DESC, ingreso_bs DESC, ec.nombre
       LIMIT 5`,
    )
    .all(desde, hasta) as Array<{ examen_id: number; examen_nombre: string; cantidad: number; ingreso_bs: number }>
  const top: ExamStat[] = topExamenes.map((row) => ({
    examen_id: row.examen_id,
    examen_nombre: row.examen_nombre,
    cantidad: row.cantidad,
    ingreso_bs: round2(row.ingreso_bs),
  }))

  const paidByMonth = db
    .prepare(
      `SELECT strftime('%Y-%m', fecha) AS mes, COALESCE(SUM(monto_bs), 0) AS bs, COALESCE(SUM(monto_usd), 0) AS usd
       FROM pagos
       WHERE anulado = 0 AND date(fecha) BETWEEN ? AND ?
       GROUP BY mes`,
    )
    .all(desde, hasta) as Array<{ mes: string; bs: number; usd: number }>
  const byMonth = new Map(paidByMonth.map((row) => [row.mes, row]))

  const ingresoMensual: MonthlyRevenue[] = []
  const cursor = new Date(`${desde.slice(0, 7)}-01T00:00:00`)
  const end = new Date(`${hasta.slice(0, 7)}-01T00:00:00`)
  while (cursor <= end) {
    const mes = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`
    const row = byMonth.get(mes)
    ingresoMensual.push({ mes, bs: round2(row?.bs ?? 0), usd: round2(row?.usd ?? 0) })
    cursor.setMonth(cursor.getMonth() + 1)
  }

  const prevMonth = previousMonthKey(desde)
  const prev = db
    .prepare(
      `SELECT COALESCE(SUM(monto_bs), 0) AS bs, COALESCE(SUM(monto_usd), 0) AS usd
       FROM pagos WHERE anulado = 0 AND strftime('%Y-%m', fecha) = ?`,
    )
    .get(prevMonth) as { bs: number; usd: number }

  return {
    top_examenes: top,
    ingreso_mensual: ingresoMensual,
    ingreso_mes_anterior_bs: round2(prev.bs),
    ingreso_mes_anterior_usd: round2(prev.usd),
  }
}

// ---------------------------------------------------------------------------
// dashboard:trends
// ---------------------------------------------------------------------------

/**
 * Numeric result series for one patient + one analyte over time (M10.4 Should).
 * Uses the WU9 result records regardless of validation state: a trend is an
 * analytical observation over time, not a deliverable report.
 */
export function getTrends(db: Database.Database, pacienteId: number, parametroId: number): Trend {
  const param = db
    .prepare('SELECT nombre, unidad FROM parametros_examen WHERE id = ?')
    .get(parametroId) as { nombre: string; unidad: string | null } | undefined
  if (!param) {
    throw new Error('NOT_FOUND')
  }

  const points = db
    .prepare(
      `SELECT date(o.fecha_solicitud, 'localtime') AS fecha, r.valor_numerico AS valor
       FROM resultados r
       JOIN orden_examenes oe ON oe.id = r.orden_examen_id
       JOIN ordenes o ON o.id = oe.orden_id
       WHERE o.paciente_id = ? AND r.parametro_id = ? AND r.valor_numerico IS NOT NULL
       ORDER BY o.fecha_solicitud ASC, r.id ASC`,
    )
    .all(pacienteId, parametroId) as Array<{ fecha: string; valor: number }>

  return {
    paciente_id: pacienteId,
    parametro_id: parametroId,
    parametro_nombre: param.nombre,
    puntos: points.map((point) => ({
      fecha: point.fecha,
      valor: point.valor,
      unidad: param.unidad,
    })),
  }
}

/**
 * Analytes (parameters) that a patient actually has numeric results for — the
 * picker source for the trends view. Qualitative-only analytes are excluded
 * because they cannot produce a numeric series.
 */
export function listPatientAnalytes(db: Database.Database, pacienteId: number): PatientAnalyte[] {
  const rows = db
    .prepare(
      `SELECT DISTINCT p.id AS parametro_id, p.nombre AS parametro_nombre, p.unidad AS unidad
       FROM resultados r
       JOIN orden_examenes oe ON oe.id = r.orden_examen_id
       JOIN ordenes o ON o.id = oe.orden_id
       JOIN parametros_examen p ON p.id = r.parametro_id
       WHERE o.paciente_id = ? AND r.valor_numerico IS NOT NULL
       ORDER BY p.nombre`,
    )
    .all(pacienteId) as Array<{ parametro_id: number; parametro_nombre: string; unidad: string | null }>
  return rows
}