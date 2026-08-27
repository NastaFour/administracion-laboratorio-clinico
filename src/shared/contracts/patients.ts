import { z } from 'zod'
import { cedulaSchema, emailSchema, idSchema, isoDateOnlySchema, phoneSchema, positiveMoneySchema } from './primitives'
import { SEX } from './constants'
import { envelopeSchema } from './errors'
import { paymentMethodSchema } from './payments'

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

// ── Dossier 360° ──────────────────────────────────────────────────────────────

export const dossierOrderSchema = z.object({
  orden_id: idSchema,
  fecha_solicitud: isoDateOnlySchema,
  estatus: z.string(),
  estatus_pago: z.string(),
  precio_total: positiveMoneySchema,
  saldo: positiveMoneySchema,
  examenes: z.array(z.object({ examen_id: idSchema, examen_nombre: z.string() })),
})

export const dossierPaymentSchema = z.object({
  id: idSchema,
  orden_id: idSchema,
  metodo: paymentMethodSchema,
  monto_bs: positiveMoneySchema,
  monto_usd: positiveMoneySchema,
  fecha: isoDateOnlySchema,
  cajero: z.string(),
})

export const dossierResultSchema = z.object({
  orden_id: idSchema,
  examen_nombre: z.string(),
  parametro_nombre: z.string(),
  valor: z.string().nullable(),
  unidad: z.string().nullable(),
  flag: z.string().nullable(),
})

export const patientDossierSchema = z.object({
  paciente: patientSchema.extend({ edad: z.number().int().nonnegative() }),
  balance: z.object({
    facturado: positiveMoneySchema,
    pagado: positiveMoneySchema,
    saldo: z.number(),
  }),
  ordenes: z.array(dossierOrderSchema),
  pagos: z.array(dossierPaymentSchema),
  resultados: z.array(dossierResultSchema),
})

export type PatientDossier = z.infer<typeof patientDossierSchema>

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
  'patients:dossier': {
    request: z.object({ pacienteId: idSchema }),
    response: envelopeSchema(patientDossierSchema),
  },
} as const

export type PatientsChannels = typeof patientsChannels

