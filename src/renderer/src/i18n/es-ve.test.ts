import { describe, it, expect } from 'vitest'
import {
  LOCALE,
  formatDate,
  formatDateTime,
  formatBs,
  formatUsd,
  formatInteger,
  isValidCedula,
  formatCedula,
  messages,
  t,
} from './es-ve'

describe('es-VE locale (i18n/es-ve.ts)', () => {
  it('exports the es-VE locale', () => {
    expect(LOCALE).toBe('es-VE')
  })

  describe('formatDate (dd/mm/yyyy)', () => {
    it('formats a date-only ISO string without timezone shift', () => {
      expect(formatDate('1985-03-15')).toBe('15/03/1985')
    })

    it('formats a Date object', () => {
      expect(formatDate(new Date(2026, 0, 5))).toBe('05/01/2026')
    })

    it('returns an em dash for invalid input', () => {
      expect(formatDate('not-a-date')).toBe('—')
      expect(formatDate(new Date(Number.NaN))).toBe('—')
    })
  })

  describe('formatDateTime', () => {
    it('renders the es-VE date part', () => {
      expect(formatDateTime(new Date(2026, 7, 24, 14, 30))).toContain('24/08/2026')
    })

    it('returns an em dash for invalid input', () => {
      expect(formatDateTime('nope')).toBe('—')
    })
  })

  describe('currency', () => {
    it('formats bolívares with thousand separator and two decimals', () => {
      expect(formatBs(1234.5)).toBe('Bs 1.234,50')
      expect(formatBs(0)).toBe('Bs 0,00')
    })

    it('formats US dollars', () => {
      expect(formatUsd(12.34)).toBe('$ 12,34')
    })

    it('formats integers with thousand separators', () => {
      expect(formatInteger(1234567)).toBe('1.234.567')
    })
  })

  describe('cédula', () => {
    it('accepts V- and E- prefixed digits', () => {
      expect(isValidCedula('V-12345678')).toBe(true)
      expect(isValidCedula('E-123')).toBe(true)
    })

    it('rejects non-cédula input', () => {
      expect(isValidCedula('ABC')).toBe(false)
      expect(isValidCedula('V12345678')).toBe(false)
      expect(isValidCedula('')).toBe(false)
    })

    it('normalizes a cédula for display', () => {
      expect(formatCedula('v-12345678')).toBe('V-12345678')
      expect(formatCedula('V12345678')).toBe('V-12345678')
      expect(formatCedula('  E-123 ')).toBe('E-123')
      expect(formatCedula('XYZ')).toBe('XYZ')
    })
  })

  describe('dictionary', () => {
    it('resolves known dot-path keys', () => {
      expect(t('common.save')).toBe('Guardar')
      expect(t('validation.cedulaInvalida')).toContain('Cédula inválida')
      expect(t('status.validado')).toBe('Validado')
    })

    it('falls back to the key for unknown paths', () => {
      expect(t('common.missing')).toBe('common.missing')
      expect(t('common')).toBe('common')
    })

    it('exposes the messages object', () => {
      expect(messages.payment.pagado).toBe('Pagado')
    })
  })
})
