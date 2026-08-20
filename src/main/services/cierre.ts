import type Database from 'better-sqlite3'
import type { Cierre, PaymentMethod, Session } from '@/shared/contracts'
import { writeAudit } from './audit'
import { getPaymentMethodTotals } from '../repositories/payments'
import { getBcvRate } from '../repositories/config'
import { upsertCierre } from '../repositories/cierre'
import { PAYMENT_METHODS, round2 } from './payments'

export interface CierreConsolidation {
  total_bs: number
  total_usd: number
  detalle_por_metodo: Record<PaymentMethod, { bs: number; usd: number }>
}

/**
 * Consolidate a day's deposit + delivery moments: every non-cancelled payment
 * on the given date, grouped by method with Bs and USD totals. The deposit and
 * delivery moments both materialize as `pagos` rows (D5: deposit at order
 * creation, balance at delivery), so the cierre sums them together.
 */
export function consolidateCierre(db: Database.Database, fecha: string): CierreConsolidation {
  const totals = getPaymentMethodTotals(db, fecha)
  const detalle = {} as Record<PaymentMethod, { bs: number; usd: number }>
  let totalBs = 0
  let totalUsd = 0
  for (const method of PAYMENT_METHODS) {
    const row = totals[method]
    detalle[method] = { bs: round2(row.bs), usd: round2(row.usd) }
    totalBs += row.bs
    totalUsd += row.usd
  }
  return {
    total_bs: round2(totalBs),
    total_usd: round2(totalUsd),
    detalle_por_metodo: detalle,
  }
}

/**
 * Run the daily cierre de caja: consolidate, snap the active BCV rate (with its
 * last-updated timestamp from history), persist the snapshot, and audit.
 */
export async function runCierreService(db: Database.Database, fecha: string, session: Session): Promise<Cierre> {
  const consolidation = consolidateCierre(db, fecha)
  const rate = getBcvRate(db)
  const { creado_en } = upsertCierre(db, {
    fecha,
    total_bs: consolidation.total_bs,
    total_usd: consolidation.total_usd,
    tasa_bcv: rate?.tasa ?? 0,
    usuario_id: session.userId,
    detalle_por_metodo: consolidation.detalle_por_metodo,
  })

  const cierre: Cierre = {
    fecha,
    total_bs: consolidation.total_bs,
    total_usd: consolidation.total_usd,
    tasa_bcv: rate?.tasa ?? 0,
    tasa_actualizado_en: rate?.actualizado_en ?? null,
    usuario_id: session.userId,
    creado_en,
    detalle_por_metodo: consolidation.detalle_por_metodo,
  }

  writeAudit(db, {
    usuario_id: session.userId,
    accion: 'cierre.ejecutado',
    entidad: 'cierre',
    entidad_id: null,
    despues: cierre,
  })

  return cierre
}

const METHOD_LABELS: Record<PaymentMethod, string> = {
  pago_movil: 'Pago móvil',
  transferencia: 'Transferencia',
  punto: 'Punto de venta',
  efectivo: 'Efectivo',
  mixto: 'Mixto',
}

function formatBs(value: number): string {
  return `Bs ${value.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatUsd(value: number): string {
  return `$ ${value.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDateOnly(fecha: string): string {
  const date = new Date(`${fecha}T00:00:00`)
  return new Intl.DateTimeFormat('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
}

/**
 * Render a printable (self-contained HTML) cierre de caja receipt. No data is
 * interpolated via innerHTML from untrusted input — every field is escaped.
 */
export function buildCierrePrintHtml(cierre: Cierre): string {
  const escapeHtml = (value: string): string =>
    value.replace(/[&<>"']/g, (char) => {
      switch (char) {
        case '&': return '&amp;'
        case '<': return '&lt;'
        case '>': return '&gt;'
        case '"': return '&quot;'
        default: return '&#39;'
      }
    })

  const rows = PAYMENT_METHODS.map((method) => {
    const row = cierre.detalle_por_metodo[method] ?? { bs: 0, usd: 0 }
    return `<tr><td>${escapeHtml(METHOD_LABELS[method])}</td><td class="num">${formatBs(row.bs)}</td><td class="num">${formatUsd(row.usd)}</td></tr>`
  }).join('')

  return `<!doctype html>
<html lang="es-VE">
<head>
<meta charset="utf-8">
<title>Cierre de Caja</title>
<style>
  body { font-family: 'IBM Plex Sans', 'Segoe UI', sans-serif; color: #1a1a1a; margin: 32px; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .sub { color: #555; font-size: 12px; margin: 0 0 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { padding: 8px 10px; text-align: left; border-bottom: 1px solid #ddd; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  tfoot td { font-weight: 700; border-top: 2px solid #1a1a1a; }
  .meta { margin-top: 16px; font-size: 12px; color: #444; line-height: 1.6; }
</style>
</head>
<body>
  <h1>Cierre de Caja</h1>
  <p class="sub">${escapeHtml(formatDateOnly(cierre.fecha))}</p>
  <table>
    <thead>
      <tr><th>Método</th><th class="num">Total Bs</th><th class="num">Total USD</th></tr>
    </thead>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr><td>Total</td><td class="num">${formatBs(cierre.total_bs)}</td><td class="num">${formatUsd(cierre.total_usd)}</td></tr>
    </tfoot>
  </table>
  <div class="meta">
    <div>Tasa BCV: ${escapeHtml(formatBs(cierre.tasa_bcv))}</div>
    <div>Última actualización de la tasa: ${escapeHtml(formatDateTime(cierre.tasa_actualizado_en))}</div>
  </div>
</body>
</html>`
}

/**
 * Produce a printable receipt for a given date without re-persisting the
 * cierre (the snapshot + audit happen on `cierre:run`).
 */
export function cierrePrintService(db: Database.Database, fecha: string): string {
  const consolidation = consolidateCierre(db, fecha)
  const rate = getBcvRate(db)
  const cierre: Cierre = {
    fecha,
    total_bs: consolidation.total_bs,
    total_usd: consolidation.total_usd,
    tasa_bcv: rate?.tasa ?? 0,
    tasa_actualizado_en: rate?.actualizado_en ?? null,
    usuario_id: 0,
    creado_en: new Date().toISOString(),
    detalle_por_metodo: consolidation.detalle_por_metodo,
  }
  return buildCierrePrintHtml(cierre)
}
