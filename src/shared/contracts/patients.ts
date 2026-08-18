import { z } from 'zod'
import { cedulaSchema, emailSchema, idSchema, isoDateOnlySchema, phoneSchema } from './primitives'
import { SEX } from './constants'
import { envelopeSchema } from './errors'

export const sexSchema = z.enum([SEX.MALE, SEX.FEMALE, SEX.OTHER])

export const patientSchema = z.object({
  id: idSchema,
  cedula: cedulaSchema,
  nombre: z.string().min(1),
  apellido: z.string().min(1),
  fecha_nacimiento: isoDateOnlySchema,
  sexo: sexSchema,
  telefono: phoneSchema.nullable(),
  email: emailSchema.nullable(),
  direccion: z.string().nullable(),
  activo: z.boolean(),
})

export type Patient = z.infer<typeof patientSchema>

export const patientInputSchema = patientSchema.omit({ id: true, activo: true })

export type PatientInput = z.infer<typeof patientInputSchema>

export const patientSearchSchema = z.object({
  query: z.string().min(1),
  limit: z.number().int().positive().default(50),
})

export type PatientSearch = z.infer<typeof patientSearchSchema>

export const patientMergeRequestSchema = z.object({
  keepId: idSchema,
  removeId: idSchema,
  conflictResolution: z.record(z.string(), z.string()),
})

export type PatientMergeRequest = z.infer<typeof patientMergeRequestSchema>

export const patientsChannels = {
  'patients:list': {
    request: z.object({ activos: z.boolean().default(true) }),
    response: envelopeSchema(z.array(patientSchema)),
  },
  'patients:search': {
    request: patientSearchSchema,
    response: envelopeSchema(z.array(patientSchema)),
  },
  'patients:get': {
    request: z.object({ id: idSchema }),
    response: envelopeSchema(patientSchema.nullable()),
  },
  'patients:create': {
    request: patientInputSchema,
    response: envelopeSchema(patientSchema),
  },
  'patients:update': {
    request: patientSchema.partial().required({ id: true }),
    response: envelopeSchema(patientSchema),
  },
  'patients:deactivate': {
    request: z.object({ id: idSchema }),
    response: envelopeSchema(patientSchema),
  },
  'patients:merge': {
    request: patientMergeRequestSchema,
    response: envelopeSchema(patientSchema),
  },
  'patients:history': {
    request: z.object({ id: idSchema }),
    response: envelopeSchema(z.array(z.unknown())),
  },
} as const

export type PatientsChannels = typeof patientsChannels
