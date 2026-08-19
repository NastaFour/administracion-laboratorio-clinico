import type { AgeUnit, Flag, OrderStatus, PaymentMethod, ResultStatus, ResultType, SampleStatus, Sex } from '@/shared/contracts'

/**
 * Convert a SQLite 0/1 integer to a boolean.
 */
export function toBoolean(value: number | null | undefined): boolean {
  return value === 1
}

/**
 * Convert a boolean to a SQLite 0/1 integer.
 */
export function fromBoolean(value: boolean): 0 | 1 {
  return value ? 1 : 0
}

/**
 * Safely parse a JSON column, returning null when the value is null/undefined.
 */
export function parseJson<T>(value: string | null | undefined): T | null {
  if (value === null || value === undefined) {
    return null
  }
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

/**
 * Stringify a value for a JSON column. Null/undefined become null.
 */
export function stringifyJson<T>(value: T | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null
  }
  return JSON.stringify(value)
}

/**
 * Coerce an unknown value into a Date ISO string, or null.
 */
export function toIsoString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null
  }
  const date = new Date(value as string | number | Date)
  if (Number.isNaN(date.getTime())) {
    return null
  }
  return date.toISOString()
}

export function toSex(value: string): Sex {
  return value as Sex
}

export function toSexScope(value: string): 'M' | 'F' | 'Ambos' {
  return value as 'M' | 'F' | 'Ambos'
}

export function toOrderStatus(value: string): OrderStatus {
  return value as OrderStatus
}

export function toSampleStatus(value: string): SampleStatus {
  return value as SampleStatus
}

export function toResultStatus(value: string): ResultStatus {
  return value as ResultStatus
}

export function toResultType(value: string): ResultType {
  return value as ResultType
}

export function toFlag(value: string): Flag {
  return value as Flag
}

export function toAgeUnit(value: string): AgeUnit {
  return value as AgeUnit
}

export function toPaymentMethod(value: string): PaymentMethod {
  return value as PaymentMethod
}
