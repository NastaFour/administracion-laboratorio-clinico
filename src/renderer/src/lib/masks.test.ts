import { describe, it, expect } from 'vitest'
import { maskCedula, maskPhone } from './masks'

describe('masks', () => {
  describe('maskCedula', () => {
    it('adds V- prefix to bare digits', () => {
      expect(maskCedula('12345678')).toBe('V-12345678')
    })

    it('preserves E- prefix', () => {
      expect(maskCedula('E87654321')).toBe('E-87654321')
    })

    it('strips non-digits beyond prefix', () => {
      expect(maskCedula('V-12.345.678')).toBe('V-12345678')
    })

    it('caps digits at 10', () => {
      expect(maskCedula('V-1234567890123')).toBe('V-1234567890')
    })
  })

  describe('maskPhone', () => {
    it('formats mobile numbers', () => {
      expect(maskPhone('04121234567')).toBe('0412-1234567')
    })

    it('returns partial input unchanged', () => {
      expect(maskPhone('0412')).toBe('0412')
    })
  })
})
