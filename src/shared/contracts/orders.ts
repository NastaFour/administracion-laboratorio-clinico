import { z } from 'zod'
import { idSchema, isoDateOnlySchema, positiveMoneySchema } from './primitives'
import { ORDER_STATUS } from './constants'
import { envelopeSchema } from './errors'

export const orderStatusSchema = z.enum([
  ORDER_STATUS.PENDIENTE,
  ORDER_STATUS.PROCESANDO,
  ORDER_STATUS.COMPLETADA,
  ORDER_STATUS.ENTREGADA,
])

export const orderExamSchema = z.object({
  // id is the orden_examenes junction row id. Optional on input (creation omits
  // it); always populated by the repository on output so the renderer can target
  // a specific exam in an order for result capture.
  id: idSchema.optional(),
  examen_id: idSchema,
  precio: positiveMoneySchema,
  tercerizado: z.boolean().default(false),
  proveedor: z.string().nullable().default(null),
  comentario: z.string().nullable().default(null),
})

export type OrderExam = z.infer<typeof orderExamSchema>

export const orderSchema = z.object({
  id: idSchema,
  paciente_id: idSchema,
  medico_id: idSchema.nullable(),
  empresa_id: idSchema.nullable(),
  estatus: orderStatusSchema,
  observaciones: z.string().nullable(),
  total_bs: positiveMoneySchema,
  credito: z.boolean(),
  anulada: z.boolean(),
  motivo_anulacion: z.string().nullable(),
  cerrada: z.boolean(),
  fecha: isoDateOnlySchema,
  creado_en: z.string().datetime(),
})

export type Order = z.infer<typeof orderSchema>

export const orderWithExamsSchema = orderSchema.extend({
  examenes: z.array(orderExamSchema),
})

export type OrderWithExams = z.infer<typeof orderWithExamsSchema>

export const createOrderRequestSchema = z.object({
  paciente_id: idSchema,
  medico_id: idSchema.nullable().default(null),
  empresa_id: idSchema.nullable().default(null),
  examenes: z.array(orderExamSchema).min(1, { error: 'Order must include at least one exam' }),
  observaciones: z.string().nullable().default(null),
})

export type CreateOrderRequest = z.infer<typeof createOrderRequestSchema>

export const updateOrderRequestSchema = createOrderRequestSchema.extend({
  id: idSchema,
})

export type UpdateOrderRequest = z.infer<typeof updateOrderRequestSchema>

export const orderFiltersSchema = z.object({
  pacienteId: idSchema.optional(),
  estatus: orderStatusSchema.optional(),
  desde: isoDateOnlySchema.optional(),
  hasta: isoDateOnlySchema.optional(),
  pendientePago: z.boolean().optional(),
})

export type OrderFilters = z.infer<typeof orderFiltersSchema>

export const authorizeCreditRequestSchema = z.object({
  id: idSchema,
  monto: positiveMoneySchema,
  motivo: z.string().min(1),
})

export type AuthorizeCreditRequest = z.infer<typeof authorizeCreditRequestSchema>

export const ordersChannels = {
  'orders:create': {
    request: createOrderRequestSchema,
    response: envelopeSchema(orderWithExamsSchema),
  },
  'orders:update': {
    request: updateOrderRequestSchema,
    response: envelopeSchema(orderWithExamsSchema),
  },
  'orders:get': {
    request: z.object({ id: idSchema }),
    response: envelopeSchema(orderWithExamsSchema.nullable()),
  },
  'orders:list': {
    request: orderFiltersSchema,
    response: envelopeSchema(z.array(orderWithExamsSchema)),
  },
  'orders:advanceStatus': {
    request: z.object({ id: idSchema }),
    response: envelopeSchema(orderSchema),
  },
  'orders:deliver': {
    request: z.object({ id: idSchema }),
    response: envelopeSchema(orderSchema),
  },
  'orders:void': {
    request: z.object({ id: idSchema, motivo: z.string().min(1) }),
    response: envelopeSchema(orderSchema),
  },
  'orders:authorizeCredit': {
    request: authorizeCreditRequestSchema,
    response: envelopeSchema(orderSchema),
  },
} as const

export type OrdersChannels = typeof ordersChannels
