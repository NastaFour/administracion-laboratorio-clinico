import { describe, it, expect } from 'vitest'
import { todayLocalDateIso } from './dates'

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
