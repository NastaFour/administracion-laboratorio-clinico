import { z } from 'zod'
import { idSchema } from './primitives'
import { FLAG, RESULT_STATUS, RESULT_TYPE } from './constants'
import { envelopeSchema } from './errors'
import { referenceRangeSchema } from './catalog'

export const resultStatusSchema = z.enum([
  RESULT_STATUS.PENDIENTE,
  RESULT_STATUS.CAPTURADO,
  RESULT_STATUS.VALIDADO,
])

export const flagSchema = z.enum([FLAG.BAJO, FLAG.ALTO, FLAG.CRITICO])

export const captureValueSchema = z.union([
  z.object({ tipo: z.literal(RESULT_TYPE.NUMERICO), valor: z.number() }),
  z.object({ tipo: z.literal(RESULT_TYPE.CUALITATIVO), valor: z.string().min(1) }),
])

export type CaptureValue = z.infer<typeof captureValueSchema>

/**
 * Snapshot of an existing result for a parameter, attached to each entry of
 * `results:paramsForCapture` so the capture screen shows the main-computed flag
 * and validation state without a separate list channel.
 */
export const paramResultSummarySchema = z.object({
  id: idSchema,
  estatus_validacion: resultStatusSchema,
  valor_numerico: z.number().nullable(),
  valor_cualitativo: z.string().nullable(),
  flag: flagSchema.nullable(),
  validado_por: idSchema.nullable(),
  comentario: z.string().nullable(),
  motivo_rechazo: z.string().nullable(),
})

export type ParamResultSummary = z.infer<typeof paramResultSummarySchema>

export const paramForCaptureSchema = z.object({
  parametro_id: idSchema,
  nombre: z.string().min(1),
  unidad: z.string().nullable(),
  tipo_resultado: z.enum([RESULT_TYPE.NUMERICO, RESULT_TYPE.CUALITATIVO]),
  opciones_cualitativas: z.array(z.string()).nullable(),
  banda: referenceRangeSchema.nullable(),
  resultado: paramResultSummarySchema.nullable(),
})

export type ParamForCapture = z.infer<typeof paramForCaptureSchema>

export const resultSchema = z.object({
  id: idSchema,
  orden_examen_id: idSchema,
  parametro_id: idSchema,
  valor_numerico: z.number().nullable(),
  valor_cualitativo: z.string().nullable(),
  estatus_validacion: resultStatusSchema,
  validado_por: idSchema.nullable(),
  validado_en: z.string().datetime().nullable(),
  flag: flagSchema.nullable(),
  comentario: z.string().nullable(),
  motivo_rechazo: z.string().nullable(),
})

export type Result = z.infer<typeof resultSchema>

export const captureResultRequestSchema = z.object({
  orden_examen_id: idSchema,
  parametro_id: idSchema,
  valor: captureValueSchema,
  comentario: z.string().nullable().default(null),
})

export type CaptureResultRequest = z.infer<typeof captureResultRequestSchema>

export const validateResultRequestSchema = z.object({
  id: idSchema,
})

export type ValidateResultRequest = z.infer<typeof validateResultRequestSchema>

export const rejectResultRequestSchema = z.object({
  id: idSchema,
  motivo: z.string().min(1),
})

export type RejectResultRequest = z.infer<typeof rejectResultRequestSchema>

export const reopenResultRequestSchema = z.object({
  id: idSchema,
  motivo: z.string().min(1),
})

export type ReopenResultRequest = z.infer<typeof reopenResultRequestSchema>

export const commentResultRequestSchema = z.object({
  id: idSchema,
  comentario: z.string().min(1),
})

export type CommentResultRequest = z.infer<typeof commentResultRequestSchema>

export const resultsChannels = {
  'results:paramsForCapture': {
    request: z.object({ ordenExamenId: idSchema }),
    response: envelopeSchema(z.array(paramForCaptureSchema)),
  },
  'results:capture': {
    request: captureResultRequestSchema,
    response: envelopeSchema(resultSchema),
  },
  'results:validate': {
    request: validateResultRequestSchema,
    response: envelopeSchema(resultSchema),
  },
  'results:reject': {
    request: rejectResultRequestSchema,
    response: envelopeSchema(resultSchema),
  },
  'results:reopen': {
    request: reopenResultRequestSchema,
    response: envelopeSchema(resultSchema),
  },
  'results:comment': {
    request: commentResultRequestSchema,
    response: envelopeSchema(resultSchema),
  },
} as const

export type ResultsChannels = typeof resultsChannels
