import { describe, it, expect } from 'vitest'
import { AGE_UNIT, FLAG, SEX, type ReferenceRange } from '@/shared/contracts'
import { computeExactAge, computeFlag, selectBand } from './referenceRanges'

function makeRange(overrides: Partial<ReferenceRange> = {}): ReferenceRange {
  return {
    id: 1,
    parametro_id: 1,
    sexo: 'Ambos',
    edad_unidad: AGE_UNIT.ANIOS,
    edad_min: 0,
    edad_max: 99,
    valor_min: 10,
    valor_max: 20,
    interpretacion: null,
    valor_min_critico: 5,
    valor_max_critico: 25,
    activo: true,
    ...overrides,
  }
}

describe('computeExactAge', () => {
  it('returns 0 days for a newborn', () => {
    const dob = new Date('2026-08-19')
    const ref = new Date('2026-08-19')
    const age = computeExactAge(dob, ref)
    expect(age.days).toBe(0)
    expect(age.months).toBe(0)
    expect(age.years).toBe(0)
  })

  it('computes premature neonate age in days', () => {
    const dob = new Date('2026-08-07')
    const ref = new Date('2026-08-19')
    const age = computeExactAge(dob, ref)
    expect(age.days).toBe(12)
    expect(age.months).toBe(0)
    expect(age.years).toBe(0)
  })

  it('handles a leap-year birthday without gaining a year early', () => {
    const dob = '2020-02-29'
    const ref = '2024-02-28'
    const age = computeExactAge(dob, ref)
    expect(age.years).toBe(3)
    expect(age.months).toBe(47)
  })

  it('advances years exactly on the birthday after a leap year', () => {
    const dob = '2020-02-29'
    const ref = '2024-03-01'
    const age = computeExactAge(dob, ref)
    expect(age.years).toBe(4)
    expect(age.months).toBe(48)
  })

  it('returns today’s birthday as a full year', () => {
    const dob = '1990-05-15'
    const ref = '2026-05-15'
    const age = computeExactAge(dob, ref)
    expect(age.years).toBe(36)
    expect(age.months).toBe(36 * 12)
  })

  it('does not round up before the birthday', () => {
    const dob = '1990-05-15'
    const ref = '2026-05-14'
    const age = computeExactAge(dob, ref)
    expect(age.years).toBe(35)
    expect(age.months).toBe(35 * 12 + 11)
  })

  it('computes months across year boundaries', () => {
    const dob = '2025-11-20'
    const ref = '2026-08-19'
    const age = computeExactAge(dob, ref)
    expect(age.months).toBe(8)
    expect(age.days).toBe(272)
  })

  it('clamps negative intervals to zero', () => {
    const dob = '2026-08-20'
    const ref = '2026-08-19'
    const age = computeExactAge(dob, ref)
    expect(age.days).toBe(0)
    expect(age.months).toBe(0)
    expect(age.years).toBe(0)
  })
})

describe('selectBand', () => {
  it('selects a neonate band by days', () => {
    const bands = [
      makeRange({ id: 1, edad_unidad: AGE_UNIT.DIAS, edad_min: 0, edad_max: 30 }),
      makeRange({ id: 2, edad_unidad: AGE_UNIT.ANIOS, edad_min: 18, edad_max: 99 }),
    ]
    const band = selectBand(bands, SEX.MALE, AGE_UNIT.DIAS, 12)
    expect(band).not.toBeNull()
    expect(band?.id).toBe(1)
  })

  it('selects an adult band by years', () => {
    const bands = [
      makeRange({ id: 1, edad_unidad: AGE_UNIT.DIAS, edad_min: 0, edad_max: 30 }),
      makeRange({ id: 2, edad_unidad: AGE_UNIT.ANIOS, edad_min: 18, edad_max: 99 }),
    ]
    const band = selectBand(bands, SEX.FEMALE, AGE_UNIT.ANIOS, 35)
    expect(band?.id).toBe(2)
  })

  it('selects an infant band by months', () => {
    const bands = [
      makeRange({ id: 1, edad_unidad: AGE_UNIT.DIAS, edad_min: 0, edad_max: 30 }),
      makeRange({ id: 2, edad_unidad: AGE_UNIT.MESES, edad_min: 1, edad_max: 12 }),
      makeRange({ id: 3, edad_unidad: AGE_UNIT.ANIOS, edad_min: 1, edad_max: 99 }),
    ]
    expect(selectBand(bands, SEX.MALE, AGE_UNIT.MESES, 2)?.id).toBe(2)
    expect(selectBand(bands, SEX.MALE, AGE_UNIT.MESES, 12)?.id).toBe(2)
    expect(selectBand(bands, SEX.MALE, AGE_UNIT.MESES, 0)).toBeNull()
  })

  it('matches the lower boundary age', () => {
    const bands = [makeRange({ id: 1, edad_unidad: AGE_UNIT.ANIOS, edad_min: 18, edad_max: 99 })]
    const band = selectBand(bands, SEX.MALE, AGE_UNIT.ANIOS, 18)
    expect(band).not.toBeNull()
    expect(band?.id).toBe(1)
  })

  it('matches the upper boundary age', () => {
    const bands = [makeRange({ id: 1, edad_unidad: AGE_UNIT.DIAS, edad_min: 0, edad_max: 30 })]
    const band = selectBand(bands, SEX.FEMALE, AGE_UNIT.DIAS, 30)
    expect(band).not.toBeNull()
    expect(band?.id).toBe(1)
  })

  it('returns null when no band matches', () => {
    const bands = [makeRange({ id: 1, edad_unidad: AGE_UNIT.ANIOS, edad_min: 18, edad_max: 99 })]
    expect(selectBand(bands, SEX.MALE, AGE_UNIT.ANIOS, 10)).toBeNull()
    expect(selectBand(bands, SEX.MALE, AGE_UNIT.DIAS, 5)).toBeNull()
  })

  it('prefers a sex-specific band over Ambos', () => {
    const bands = [
      makeRange({ id: 1, sexo: 'Ambos', edad_unidad: AGE_UNIT.ANIOS, edad_min: 18, edad_max: 99 }),
      makeRange({ id: 2, sexo: SEX.FEMALE, edad_unidad: AGE_UNIT.ANIOS, edad_min: 18, edad_max: 99 }),
    ]
    const band = selectBand(bands, SEX.FEMALE, AGE_UNIT.ANIOS, 35)
    expect(band?.id).toBe(2)
  })

  it('falls back to Ambos when no sex-specific band exists', () => {
    const bands = [
      makeRange({ id: 1, sexo: 'Ambos', edad_unidad: AGE_UNIT.ANIOS, edad_min: 18, edad_max: 99 }),
    ]
    const band = selectBand(bands, SEX.FEMALE, AGE_UNIT.ANIOS, 35)
    expect(band?.id).toBe(1)
  })

  it('filters by sex when no Ambos band exists', () => {
    const bands = [
      makeRange({ id: 1, sexo: SEX.MALE, edad_unidad: AGE_UNIT.ANIOS, edad_min: 18, edad_max: 99 }),
      makeRange({ id: 2, sexo: SEX.FEMALE, edad_unidad: AGE_UNIT.ANIOS, edad_min: 18, edad_max: 99 }),
    ]
    expect(selectBand(bands, SEX.MALE, AGE_UNIT.ANIOS, 35)?.id).toBe(1)
    expect(selectBand(bands, SEX.FEMALE, AGE_UNIT.ANIOS, 35)?.id).toBe(2)
  })

  it('ignores inactive bands', () => {
    const bands = [
      makeRange({ id: 1, activo: false }),
      makeRange({ id: 2, activo: true }),
    ]
    const band = selectBand(bands, SEX.MALE, AGE_UNIT.ANIOS, 50)
    expect(band?.id).toBe(2)
  })

  it('does not mix age units', () => {
    const bands = [makeRange({ id: 1, edad_unidad: AGE_UNIT.MESES, edad_min: 1, edad_max: 12 })]
    expect(selectBand(bands, SEX.MALE, AGE_UNIT.DIAS, 15)).toBeNull()
  })
})

describe('computeFlag', () => {
  it('returns null for a value inside the normal range', () => {
    const band = makeRange({ valor_min: 13.5, valor_max: 17.5, valor_min_critico: 7, valor_max_critico: 21 })
    expect(computeFlag(15, band, true)).toBeNull()
    expect(computeFlag(13.5, band, true)).toBeNull()
    expect(computeFlag(17.5, band, true)).toBeNull()
  })

  it('flags low values', () => {
    const band = makeRange({ valor_min: 13.5, valor_max: 17.5 })
    expect(computeFlag(10, band, true)).toBe(FLAG.BAJO)
    expect(computeFlag(13.4, band, true)).toBe(FLAG.BAJO)
  })

  it('flags high values', () => {
    const band = makeRange({ valor_min: 13.5, valor_max: 17.5 })
    expect(computeFlag(20, band, true)).toBe(FLAG.ALTO)
    expect(computeFlag(17.6, band, true)).toBe(FLAG.ALTO)
  })

  it('flags critical low values when critical check is enabled', () => {
    const band = makeRange({ valor_min: 13.5, valor_max: 17.5, valor_min_critico: 7 })
    expect(computeFlag(7, band, true)).toBe(FLAG.CRITICO)
    expect(computeFlag(6.9, band, true)).toBe(FLAG.CRITICO)
  })

  it('flags critical high values when critical check is enabled', () => {
    const band = makeRange({ valor_min: 13.5, valor_max: 17.5, valor_max_critico: 21 })
    expect(computeFlag(21, band, true)).toBe(FLAG.CRITICO)
    expect(computeFlag(22, band, true)).toBe(FLAG.CRITICO)
  })

  it('ignores critical thresholds when critical check is disabled', () => {
    const band = makeRange({ valor_min: 13.5, valor_max: 17.5, valor_min_critico: 7, valor_max_critico: 21 })
    expect(computeFlag(6, band, false)).toBe(FLAG.BAJO)
    expect(computeFlag(22, band, false)).toBe(FLAG.ALTO)
  })

  it('returns null for null or undefined values', () => {
    const band = makeRange()
    expect(computeFlag(null, band, true)).toBeNull()
    expect(computeFlag(undefined, band, true)).toBeNull()
  })

  it('returns null when no band is provided', () => {
    expect(computeFlag(15, null, true)).toBeNull()
    expect(computeFlag(15, undefined, true)).toBeNull()
  })

  it('handles one-sided ranges', () => {
    const lowOnly = makeRange({
      valor_min: 10,
      valor_max: null,
      valor_min_critico: null,
      valor_max_critico: null,
    })
    expect(computeFlag(5, lowOnly, true)).toBe(FLAG.BAJO)
    expect(computeFlag(20, lowOnly, true)).toBeNull()

    const highOnly = makeRange({
      valor_min: null,
      valor_max: 20,
      valor_min_critico: null,
      valor_max_critico: null,
    })
    expect(computeFlag(25, highOnly, true)).toBe(FLAG.ALTO)
    expect(computeFlag(15, highOnly, true)).toBeNull()
  })

  it('does not flag qualitative or non-numeric values', () => {
    const band = makeRange()
    expect(computeFlag(Number.NaN, band, true)).toBeNull()
  })

  it('prioritizes critical over high/low when both apply', () => {
    const band = makeRange({ valor_min: 10, valor_max: 20, valor_min_critico: 5, valor_max_critico: 25 })
    expect(computeFlag(5, band, true)).toBe(FLAG.CRITICO)
    expect(computeFlag(25, band, true)).toBe(FLAG.CRITICO)
  })
})
