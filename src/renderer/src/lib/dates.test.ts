import { describe, it, expect } from 'vitest'
import { todayLocalDateIso, getPeriodRange, shiftAnchorDate } from './dates'

describe('todayLocalDateIso', () => {
  it('formats a local instant as YYYY-MM-DD using local calendar fields', () => {
    // Constructed from LOCAL components: 2026-08-18 at 21:30 local time.
    const date = new Date(2026, 7, 18, 21, 30, 0)
    expect(todayLocalDateIso(date)).toBe('2026-08-18')
  })

  it('never leaks the UTC day for late-evening instants (UTC-negative zones)', () => {
    // 2026-08-18T03:30Z is still Aug 17 in Venezuela (UTC-4): the UTC date
    // string would read "2026-08-18" while the LOCAL business day is the 17th.
    // Build the same wall-clock instant from local components so this holds
    // on any OS timezone.
    const lateEvening = new Date(2026, 7, 17, 23, 0, 0)
    expect(todayLocalDateIso(lateEvening)).toBe('2026-08-17')
    expect(todayLocalDateIso(lateEvening)).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('zero-pads single-digit months and days', () => {
    const date = new Date(2026, 0, 5, 8, 0, 0)
    expect(todayLocalDateIso(date)).toBe('2026-01-05')
  })
})

describe('getPeriodRange & shiftAnchorDate', () => {
  it('calculates dia period range accurately', () => {
    const d = new Date(2026, 7, 25) // 2026-08-25
    const range = getPeriodRange('dia', d)
    expect(range.tipo).toBe('dia')
    expect(range.desde).toBe('2026-08-25')
    expect(range.hasta).toBe('2026-08-25')
  })

  it('calculates semana period range (Monday to Sunday)', () => {
    // 2026-08-27 is Thursday
    const d = new Date(2026, 7, 27)
    const range = getPeriodRange('semana', d)
    expect(range.tipo).toBe('semana')
    expect(range.desde).toBe('2026-08-24') // Monday
    expect(range.hasta).toBe('2026-08-30') // Sunday
  })

  it('calculates semana when anchor is Sunday', () => {
    // 2026-08-30 is Sunday
    const d = new Date(2026, 7, 30)
    const range = getPeriodRange('semana', d)
    expect(range.desde).toBe('2026-08-24')
    expect(range.hasta).toBe('2026-08-30')
  })

  it('calculates mes period range and handles leap year February', () => {
    // 2024 is leap year
    const feb2024 = new Date(2024, 1, 15)
    const range = getPeriodRange('mes', feb2024)
    expect(range.tipo).toBe('mes')
    expect(range.desde).toBe('2024-02-01')
    expect(range.hasta).toBe('2024-02-29')
    expect(range.label).toBe('Febrero 2024')
  })

  it('calculates anio period range', () => {
    const d = new Date(2026, 7, 25)
    const range = getPeriodRange('anio', d)
    expect(range.tipo).toBe('anio')
    expect(range.desde).toBe('2026-01-01')
    expect(range.hasta).toBe('2026-12-31')
    expect(range.label).toBe('Año 2026')
  })

  it('shifts anchor dates correctly across days, weeks, months, and years', () => {
    const d = new Date(2026, 7, 25) // 25 Aug 2026
    expect(todayLocalDateIso(shiftAnchorDate('dia', d, 1))).toBe('2026-08-26')
    expect(todayLocalDateIso(shiftAnchorDate('dia', d, -1))).toBe('2026-08-24')

    expect(todayLocalDateIso(shiftAnchorDate('semana', d, 1))).toBe('2026-09-01')
    expect(todayLocalDateIso(shiftAnchorDate('semana', d, -1))).toBe('2026-08-18')

    expect(todayLocalDateIso(shiftAnchorDate('mes', d, 1))).toBe('2026-09-01')
    expect(todayLocalDateIso(shiftAnchorDate('mes', d, -1))).toBe('2026-07-01')

    expect(todayLocalDateIso(shiftAnchorDate('anio', d, 1))).toBe('2027-01-01')
    expect(todayLocalDateIso(shiftAnchorDate('anio', d, -1))).toBe('2025-01-01')
  })
})
