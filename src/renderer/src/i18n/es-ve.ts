/**
 * es-VE locale pass (WU15).
 *
 * Canonical Venezuelan-Spanish formatting, cédula validation, and a UI
 * dictionary for the renderer. Technical artifacts (identifiers, comments,
 * types) stay in English per the project contract; only the user-visible
 * strings and formatter outputs are es-VE.
 *
 * `Intl.DateTimeFormat('es-VE')` / `Intl.NumberFormat('es-VE')` are the
 * workhorses (Electron's embedded Node ships full ICU), with a date-only
 * fast path so `YYYY-MM-DD` strings never shift a day under a west-of-UTC
 * timezone (America/Caracas is UTC-4).
 */

export const LOCALE = 'es-VE'

// ── Date / time ─────────────────────────────────────────────────────────────

const dateFormatter = new Intl.DateTimeFormat(LOCALE, {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

const dateTimeFormatter = new Intl.DateTimeFormat(LOCALE, {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

/** Formats an ISO-8601 date (date-only or full) as `dd/mm/yyyy`. */
export function formatDate(value: string | Date): string {
  if (typeof value === 'string') {
    const match = DATE_ONLY_PATTERN.exec(value)
    if (match) {
      // Date-only strings are formatted as-is; `new Date('YYYY-MM-DD')` parses
      // as UTC midnight and shifts a day back in UTC-4.
      return `${match[3]}/${match[2]}/${match[1]}`
    }
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? '—' : dateFormatter.format(date)
  }
  return Number.isNaN(value.getTime()) ? '—' : dateFormatter.format(value)
}

/** Formats an ISO-8601 timestamp as `dd/mm/yyyy HH:mm`. */
export function formatDateTime(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value
  return Number.isNaN(date.getTime()) ? '—' : dateTimeFormatter.format(date)
}

// ── Currency / numbers ──────────────────────────────────────────────────────

const bsFormatter = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const usdFormatter = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const integerFormatter = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 })

/** Formats a bolívar amount as `Bs 1.234,56`. */
export function formatBs(amount: number): string {
  return `Bs ${bsFormatter.format(amount)}`
}

/** Formats a US-dollar amount as `$ 12,34`. */
export function formatUsd(amount: number): string {
  return `$ ${usdFormatter.format(amount)}`
}

/** Formats an integer count with es-VE thousand separators (e.g. `1.234`). */
export function formatInteger(value: number): string {
  return integerFormatter.format(value)
}

// ── Cédula ──────────────────────────────────────────────────────────────────

const CEDULA_PATTERN = /^[VE]-\d{1,10}$/

/** Returns true for a canonical Venezuelan cédula (`V-`/`E-` prefix + digits). */
export function isValidCedula(value: string): boolean {
  return CEDULA_PATTERN.test(value.trim())
}

/**
 * Normalizes a cédula for display: uppercase prefix, single dash, digits only.
 * Returns the input unchanged when it is not a recognizable cédula.
 */
export function formatCedula(value: string): string {
  const cleaned = value.trim().toUpperCase().replace(/\s+/g, '')
  const match = /^([VE])-?(\d{1,10})$/.exec(cleaned)
  return match ? `${match[1]}-${match[2]}` : value
}

// ── Dictionary ──────────────────────────────────────────────────────────────

/**
 * Central es-VE UI dictionary. Common actions, validation messages, status and
 * payment-state labels live here so components stop hardcoding Spanish strings.
 */
export const messages = {
  common: {
    save: 'Guardar',
    cancel: 'Cancelar',
    edit: 'Editar',
    delete: 'Eliminar',
    search: 'Buscar',
    close: 'Cerrar',
    yes: 'Sí',
    no: 'No',
  },
  validation: {
    required: 'Este campo es obligatorio.',
    cedulaInvalida: 'Cédula inválida. Use V- o E- seguido de dígitos.',
  },
  status: {
    pendiente: 'Pendiente',
    capturado: 'Capturado',
    validado: 'Validado',
  },
  payment: {
    pagado: 'Pagado',
    pendiente: 'Pendiente',
    credito: 'Crédito',
  },
} as const

/**
 * Resolves a dot-path (`common.save`) against the dictionary. Returns the key
 * itself when the path does not resolve, so a missing key is never silent.
 */
export function t(dotPath: string): string {
  let current: unknown = messages
  for (const part of dotPath.split('.')) {
    if (typeof current !== 'object' || current === null || !(part in current)) {
      return dotPath
    }
    current = (current as Record<string, unknown>)[part]
  }
  return typeof current === 'string' ? current : dotPath
}
