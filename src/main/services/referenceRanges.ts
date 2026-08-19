/**
 * Pure clinical module for reference-range selection, out-of-range flagging,
 * and exact-age calculation. No DB or Electron imports — consumed by results
 * capture (WU9) and report building (WU10).
 */

import { FLAG, type AgeUnit, type Flag, type ReferenceRange, type Sex } from '@/shared/contracts'

export interface ExactAge {
  days: number
  months: number
  years: number
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

function normalizeDate(input: Date | string): Date {
  const d = typeof input === 'string' ? new Date(input) : new Date(input.getTime())
  d.setHours(0, 0, 0, 0)
  return d
}

function daysBetween(start: Date, end: Date): number {
  return Math.floor((end.getTime() - start.getTime()) / MS_PER_DAY)
}

function fullCalendarYears(start: Date, end: Date): number {
  let years = end.getFullYear() - start.getFullYear()
  const monthDiff = end.getMonth() - start.getMonth()
  const dayDiff = end.getDate() - start.getDate()
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    years--
  }
  return Math.max(0, years)
}

function fullCalendarMonths(start: Date, end: Date): number {
  let months = (end.getFullYear() - start.getFullYear()) * 12
  months += end.getMonth() - start.getMonth()
  const dayDiff = end.getDate() - start.getDate()
  if (dayDiff < 0) {
    months--
  }
  return Math.max(0, months)
}

/**
 * Compute exact age at a reference date in days, full calendar months,
 * and full calendar years. Handles leap years and same-day birthdays.
 */
export function computeExactAge(dob: Date | string, refDate: Date | string): ExactAge {
  const start = normalizeDate(dob)
  const end = normalizeDate(refDate)

  if (end < start) {
    return { days: 0, months: 0, years: 0 }
  }

  return {
    days: daysBetween(start, end),
    months: fullCalendarMonths(start, end),
    years: fullCalendarYears(start, end),
  }
}

/**
 * Select the reference band that matches the patient's sex and age.
 * `age` is the numeric value in the unit specified by `ageUnit`; only bands
 * using the same age unit are considered. Sex-specific bands are preferred
 * over "Ambos" bands.
 */
export function selectBand(
  bands: ReferenceRange[],
  sex: Sex,
  ageUnit: AgeUnit,
  age: number,
): ReferenceRange | null {
  const matches = bands.filter((band) => {
    if (!band.activo) return false
    if (band.edad_unidad !== ageUnit) return false
    if (band.sexo !== 'Ambos' && band.sexo !== sex) return false
    return age >= band.edad_min && age <= band.edad_max
  })

  const sexSpecific = matches.find((band) => band.sexo === sex)
  return sexSpecific ?? matches[0] ?? null
}

/**
 * Compute the out-of-range flag for a numeric value against a reference band.
 * Critical thresholds are evaluated only when `checkCritical` is true.
 * Returns null for normal or non-numeric values.
 */
export function computeFlag(
  value: number | null | undefined,
  band: ReferenceRange | null | undefined,
  checkCritical: boolean,
): Flag | null {
  if (band == null || value == null || Number.isNaN(value)) {
    return null
  }

  const min = band.valor_min
  const max = band.valor_max
  const minCrit = band.valor_min_critico
  const maxCrit = band.valor_max_critico

  if (checkCritical) {
    if (minCrit !== null && value <= minCrit) {
      return FLAG.CRITICO
    }
    if (maxCrit !== null && value >= maxCrit) {
      return FLAG.CRITICO
    }
  }

  if (min !== null && value < min) {
    return FLAG.BAJO
  }
  if (max !== null && value > max) {
    return FLAG.ALTO
  }

  return null
}
