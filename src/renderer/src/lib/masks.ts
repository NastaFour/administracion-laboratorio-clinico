/**
 * Venezuelan cédula mask: enforces V- or E- prefix followed by up to 10 digits.
 * If the user types digits without a prefix, V- is assumed.
 */
export function maskCedula(value: string): string {
  const cleaned = value.replace(/[^VEve\d]/g, '').toUpperCase()

  let prefix = 'V'
  let digits = cleaned

  if (cleaned.startsWith('V') || cleaned.startsWith('E')) {
    prefix = cleaned[0] as 'V' | 'E'
    digits = cleaned.slice(1)
  }

  digits = digits.replace(/\D/g, '').slice(0, 10)
  return digits ? `${prefix}-${digits}` : prefix
}

/**
 * Phone mask: Venezuelan mobile format 04XX-XXXXXXX.
 */
export function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 4) return digits
  return `${digits.slice(0, 4)}-${digits.slice(4)}`
}

export function unmask(value: string): string {
  return value.replace(/[^A-Z\d]/gi, '')
}
