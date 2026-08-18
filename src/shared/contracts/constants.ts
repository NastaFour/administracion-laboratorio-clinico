/**
 * Domain constants shared across main, preload, and renderer.
 * Keep const objects as the single runtime source of truth, then derive types.
 */

export const ROLES = {
  ADMIN: 'admin',
  BIOANALISTA: 'bioanalista',
  TECNICO: 'tecnico',
  RECEPCION: 'recepcion',
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

export const ORDER_STATUS = {
  PENDIENTE: 'Pendiente',
  PROCESANDO: 'Procesando',
  COMPLETADA: 'Completada',
  ENTREGADA: 'Entregada',
} as const

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS]

export const SAMPLE_STATUS = {
  RECOLECTADA: 'Recolectada',
  EN_PROCESO: 'En proceso',
  RESULTADA: 'Resultada',
  RECHAZADA: 'Rechazada',
} as const

export type SampleStatus = (typeof SAMPLE_STATUS)[keyof typeof SAMPLE_STATUS]

export const RESULT_STATUS = {
  PENDIENTE: 'Pendiente',
  CAPTURADO: 'Capturado',
  VALIDADO: 'Validado',
} as const

export type ResultStatus = (typeof RESULT_STATUS)[keyof typeof RESULT_STATUS]

export const PAYMENT_METHOD = {
  PAGO_MOVIL: 'pago_movil',
  TRANSFERENCIA: 'transferencia',
  PUNTO: 'punto',
  EFECTIVO: 'efectivo',
  MIXTO: 'mixto',
} as const

export type PaymentMethod = (typeof PAYMENT_METHOD)[keyof typeof PAYMENT_METHOD]

export const SEX = {
  MALE: 'M',
  FEMALE: 'F',
  OTHER: 'O',
} as const

export type Sex = (typeof SEX)[keyof typeof SEX]

export const AGE_UNIT = {
  DIAS: 'dias',
  MESES: 'meses',
  ANIOS: 'anios',
} as const

export type AgeUnit = (typeof AGE_UNIT)[keyof typeof AGE_UNIT]

export const FLAG = {
  BAJO: 'bajo',
  ALTO: 'alto',
  CRITICO: 'critico',
} as const

export type Flag = (typeof FLAG)[keyof typeof FLAG]

export const RESULT_TYPE = {
  NUMERICO: 'numerico',
  CUALITATIVO: 'cualitativo',
} as const

export type ResultType = (typeof RESULT_TYPE)[keyof typeof RESULT_TYPE]
