/**
 * Local calendar-day helpers for the renderer.
 *
 * Payment/cierre business dates are LOCAL date-only strings (`YYYY-MM-DD`).
 * They must NEVER be derived from `toISOString()` — that renders the UTC
 * calendar day, which is the NEXT day during Venezuela evenings (UTC-4) and
 * misattributes business days.
 */

/** Local `YYYY-MM-DD` for the given instant (defaults to now). */
export function todayLocalDateIso(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
