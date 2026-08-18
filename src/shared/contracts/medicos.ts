import { z } from 'zod'
import { cedulaSchema, idSchema, phoneSchema } from './primitives'
import { envelopeSchema } from './errors'

export const medicoSchema = z.object({
  id: idSchema,
  nombre: z.string().min(1),
  cedula: cedulaSchema.nullable(),
  especialidad: z.string().min(1),
  telefono: phoneSchema.nullable(),
  activo: z.boolean(),
})

export type Medico = z.infer<typeof medicoSchema>

export const medicoInputSchema = medicoSchema.omit({ id: true, activo: true })

export type MedicoInput = z.infer<typeof medicoInputSchema>

export const medicosChannels = {
  'medicos:list': {
    request: z.object({ activos: z.boolean().default(true) }),
    response: envelopeSchema(z.array(medicoSchema)),
  },
  'medicos:save': {
    request: medicoInputSchema.extend({ id: idSchema.optional() }),
    response: envelopeSchema(medicoSchema),
  },
  'medicos:deactivate': {
    request: z.object({ id: idSchema }),
    response: envelopeSchema(medicoSchema),
  },
} as const

export type MedicosChannels = typeof medicosChannels
