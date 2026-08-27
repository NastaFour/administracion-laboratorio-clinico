import { z } from 'zod'
import { idSchema, isoDateOnlySchema, positiveMoneySchema } from './primitives'
import { PAYMENT_METHOD } from './constants'
import { envelopeSchema } from './errors'

export const moneySchema = positiveMoneySchema

export const paymentMethodSchema = z.enum([
  PAYMENT_METHOD.PAGO_MOVIL,
  PAYMENT_METHOD.TRANSFERENCIA,
  PAYMENT_METHOD.PUNTO,
  PAYMENT_METHOD.EFECTIVO,
  PAYMENT_METHOD.MIXTO,
])

export const paymentSchema = z.object({
  id: idSchema,
  orden_id: idSchema,
  cuenta_id: idSchema.nullable(),
  metodo: paymentMethodSchema,
  monto_bs: positiveMoneySchema,
  monto_usd: positiveMoneySchema,
  tasa_bcv: positiveMoneySchema,
  referencia: z.string().nullable(),
  fecha: isoDateOnlySchema,
  usuario_id: idSchema,
  anulado: z.boolean(),
  anulado_por: idSchema.nullable(),
  anulado_en: z.string().datetime().nullable(),
})

export type Payment = z.infer<typeof paymentSchema>

export const recordPaymentRequestSchema = z.object({
  orden_id: idSchema,
  cuenta_id: idSchema.nullable().default(null),
  metodo: paymentMethodSchema,
  monto_bs: positiveMoneySchema.default(0),
  monto_usd: positiveMoneySchema.default(0),
  tasa_bcv: positiveMoneySchema.optional(),
  referencia: z.string().nullable().default(null),
  fecha: isoDateOnlySchema,
})

export type RecordPaymentRequest = z.infer<typeof recordPaymentRequestSchema>

export const cancelPaymentRequestSchema = z.object({
  id: idSchema,
  motivo: z.string().min(1),
})

export type CancelPaymentRequest = z.infer<typeof cancelPaymentRequestSchema>

export const listAllPaymentsRequestSchema = z.object({
  desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  hasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  soloDeudores: z.boolean().optional(),
  query: z.string().optional(),
})

export type ListAllPaymentsRequest = z.infer<typeof listAllPaymentsRequestSchema>

export const paymentListItemSchema = z.object({
  id: idSchema,
  ordenId: idSchema,
  pacienteId: idSchema,
  pacienteNombre: z.string(),
  pacienteCedula: z.string(),
  metodo: paymentMethodSchema,
  monto_bs: moneySchema,
  monto_usd: moneySchema,
  tasa_bcv: moneySchema,
  fecha: isoDateOnlySchema,
  cajero: z.string(),
  totalOrden: moneySchema,
  saldoActualOrden: moneySchema,
  anulado: z.boolean(),
})
export type PaymentListItem = z.infer<typeof paymentListItemSchema>

export const listCierresRequestSchema = z.object({
  desde: isoDateOnlySchema.optional(),
  hasta: isoDateOnlySchema.optional(),
})
export type ListCierresRequest = z.infer<typeof listCierresRequestSchema>

export const cierreHistoryItemSchema = z.object({
  id: idSchema,
  fecha: isoDateOnlySchema,
  total_bs: moneySchema,
  total_usd: moneySchema,
  tasa_bcv: z.number().nullable(),
  cerrado_por: z.string(),
  cerrado_en: z.string(),
  detalle_por_metodo: z.record(
    z.string(),
    z.object({ bs: moneySchema, usd: moneySchema }),
  ),
})
export type CierreHistoryItem = z.infer<typeof cierreHistoryItemSchema>

export const cierrePeriodTotalSchema = z.object({
  bs: moneySchema,
  usd: moneySchema,
})

export const cierreMetricsSchema = z.object({
  dia: cierrePeriodTotalSchema,
  semana: cierrePeriodTotalSchema,
  mes: cierrePeriodTotalSchema,
  anio: cierrePeriodTotalSchema,
})
export type CierreMetrics = z.infer<typeof cierreMetricsSchema>

export const cierreMetricsRequestSchema = z.object({
  fechaReferencia: isoDateOnlySchema.optional(),
})
export type CierreMetricsRequest = z.infer<typeof cierreMetricsRequestSchema>

export const balanceSchema = z.object({
  orden_id: idSchema,
  total_bs: positiveMoneySchema,
  pagado_bs: positiveMoneySchema,
  saldo_bs: positiveMoneySchema,
  total_usd: positiveMoneySchema,
  pagado_usd: positiveMoneySchema,
  saldo_usd: positiveMoneySchema,
})

export type Balance = z.infer<typeof balanceSchema>

export const cierreSchema = z.object({
  fecha: isoDateOnlySchema,
  total_bs: positiveMoneySchema,
  total_usd: positiveMoneySchema,
  tasa_bcv: positiveMoneySchema,
  tasa_actualizado_en: z.string().datetime().nullable(),
  usuario_id: idSchema,
  creado_en: z.string().datetime(),
  detalle_por_metodo: z.record(z.string(), z.object({ bs: positiveMoneySchema, usd: positiveMoneySchema })),
})

export type Cierre = z.infer<typeof cierreSchema>

export const bcvRateSchema = z.object({
  tasa: positiveMoneySchema,
  actualizado_en: z.string().datetime(),
})

export type BcvRate = z.infer<typeof bcvRateSchema>

export const paymentsChannels = {
  'payments:record': {
    request: recordPaymentRequestSchema,
    response: envelopeSchema(paymentSchema),
  },
  'payments:cancel': {
    request: cancelPaymentRequestSchema,
    response: envelopeSchema(paymentSchema),
  },
  'payments:listForOrder': {
    request: z.object({ ordenId: idSchema }),
    response: envelopeSchema(z.array(paymentSchema)),
  },
  'payments:balance': {
    request: z.object({ ordenId: idSchema }),
    response: envelopeSchema(balanceSchema),
  },
  'payments:listAll': {
    request: listAllPaymentsRequestSchema,
    response: envelopeSchema(z.array(paymentListItemSchema)),
  },
  'cierre:run': {
    request: z.object({ fecha: isoDateOnlySchema }),
    response: envelopeSchema(cierreSchema),
  },
  'cierre:print': {
    request: z.object({ fecha: isoDateOnlySchema }),
    response: envelopeSchema(z.string()),
  },
  'cierre:list': {
    request: listCierresRequestSchema,
    response: envelopeSchema(z.array(cierreHistoryItemSchema)),
  },
  'cierre:metrics': {
    request: cierreMetricsRequestSchema,
    response: envelopeSchema(cierreMetricsSchema),
  },
  'config:getBcvRate': {
    request: z.void(),
    response: envelopeSchema(bcvRateSchema.nullable()),
  },
  'config:setBcvRate': {
    request: z.object({ tasa: positiveMoneySchema }),
    response: envelopeSchema(bcvRateSchema),
  },
} as const

export type PaymentsChannels = typeof paymentsChannels
