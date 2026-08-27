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

export type PeriodType = 'dia' | 'semana' | 'mes' | 'anio'

export interface PeriodRange {
  tipo: PeriodType
  desde: string
  hasta: string
  label: string
}

const MONTH_NAMES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

export function formatShortDate(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  return `${day}/${month}`
}

export function formatFullDate(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

export function getPeriodRange(tipo: PeriodType, anchorDate: Date = new Date()): PeriodRange {
  const d = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), anchorDate.getDate())
  const todayIso = todayLocalDateIso(new Date())

  if (tipo === 'dia') {
    const iso = todayLocalDateIso(d)
    const isToday = iso === todayIso
    return {
      tipo,
      desde: iso,
      hasta: iso,
      label: isToday ? `Hoy · ${formatFullDate(d)}` : formatFullDate(d),
    }
  }

  if (tipo === 'semana') {
    const dayOfWeek = d.getDay() // 0 = Sun, 1 = Mon ... 6 = Sat
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diffToMonday)
    const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6)
    return {
      tipo,
      desde: todayLocalDateIso(monday),
      hasta: todayLocalDateIso(sunday),
      label: `Semana ${formatShortDate(monday)} – ${formatFullDate(sunday)}`,
    }
  }

  if (tipo === 'mes') {
    const firstDay = new Date(d.getFullYear(), d.getMonth(), 1)
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0)
    return {
      tipo,
      desde: todayLocalDateIso(firstDay),
      hasta: todayLocalDateIso(lastDay),
      label: `${MONTH_NAMES_ES[d.getMonth()]} ${d.getFullYear()}`,
    }
  }

  // anio
  const firstDay = new Date(d.getFullYear(), 0, 1)
  const lastDay = new Date(d.getFullYear(), 11, 31)
  return {
    tipo,
    desde: todayLocalDateIso(firstDay),
    hasta: todayLocalDateIso(lastDay),
    label: `Año ${d.getFullYear()}`,
  }
}

export function shiftAnchorDate(tipo: PeriodType, anchorDate: Date, direction: -1 | 1): Date {
  const year = anchorDate.getFullYear()
  const month = anchorDate.getMonth()
  const date = anchorDate.getDate()

  if (tipo === 'dia') {
    return new Date(year, month, date + direction)
  }
  if (tipo === 'semana') {
    return new Date(year, month, date + direction * 7)
  }
  if (tipo === 'mes') {
    return new Date(year, month + direction, 1)
  }
  // anio
  return new Date(year + direction, 0, 1)
}
