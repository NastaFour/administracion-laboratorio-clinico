import { z } from 'zod'
import { idSchema } from './primitives'
import { SAMPLE_STATUS } from './constants'
import { envelopeSchema } from './errors'

export const sampleStatusSchema = z.enum([
  SAMPLE_STATUS.RECOLECTADA,
  SAMPLE_STATUS.EN_PROCESO,
  SAMPLE_STATUS.RESULTADA,
  SAMPLE_STATUS.RECHAZADA,
])

export const sampleSchema = z.object({
  id: idSchema,
  orden_examen_id: idSchema,
  tipo_muestra: z.string().min(1),
  codigo: z.string().min(1),
  estatus: sampleStatusSchema,
  motivo_rechazo: z.string().nullable(),
  recoleccion_en: z.string().datetime().nullable(),
  creado_en: z.string().datetime(),
})

export type Sample = z.infer<typeof sampleSchema>

export const registerSamplesRequestSchema = z.object({
  ordenId: idSchema,
  recoleccion_en: z.string().datetime().optional(),
})

export type RegisterSamplesRequest = z.infer<typeof registerSamplesRequestSchema>

export const updateSampleStatusRequestSchema = z.object({
  id: idSchema,
  estatus: sampleStatusSchema,
  recoleccion_en: z.string().datetime().optional(),
})

export type UpdateSampleStatusRequest = z.infer<typeof updateSampleStatusRequestSchema>

export const rejectSampleRequestSchema = z.object({
  id: idSchema,
  motivo: z.string().min(1),
})

export type RejectSampleRequest = z.infer<typeof rejectSampleRequestSchema>

export const samplesChannels = {
  'samples:register': {
    request: registerSamplesRequestSchema,
    response: envelopeSchema(z.array(sampleSchema)),
  },
  'samples:list': {
    request: z.object({ ordenId: idSchema }),
    response: envelopeSchema(z.array(sampleSchema)),
  },
  'samples:updateStatus': {
    request: updateSampleStatusRequestSchema,
    response: envelopeSchema(sampleSchema),
  },
  'samples:reject': {
    request: rejectSampleRequestSchema,
    response: envelopeSchema(sampleSchema),
  },
  'samples:label': {
    request: z.object({ id: idSchema }),
    response: envelopeSchema(z.string()),
  },
} as const

export type SamplesChannels = typeof samplesChannels
