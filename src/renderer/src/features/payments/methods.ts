import type { PaymentMethod } from '@/shared/contracts'
import { PAYMENT_METHOD } from '@/shared/contracts'

export const METHOD_LABELS: Record<PaymentMethod, string> = {
  [PAYMENT_METHOD.PAGO_MOVIL]: 'Pago móvil',
  [PAYMENT_METHOD.TRANSFERENCIA]: 'Transferencia',
  [PAYMENT_METHOD.PUNTO]: 'Punto de venta',
  [PAYMENT_METHOD.EFECTIVO]: 'Efectivo',
  [PAYMENT_METHOD.MIXTO]: 'Mixto',
}

export const METHOD_OPTIONS: PaymentMethod[] = Object.values(PAYMENT_METHOD)
