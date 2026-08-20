import { z } from 'zod'
import { emailSchema, phoneSchema } from './primitives'
import { envelopeSchema } from './errors'

export const labConfigSchema = z.object({
  nombre: z.string().min(1),
  rif: z.string().nullable(),
  direccion: z.string().nullable(),
  sede: z.string().nullable(),
  telefono: phoneSchema.nullable(),
  email: emailSchema.nullable(),
  logo: z.string().nullable(),
})

export type LabConfig = z.infer<typeof labConfigSchema>

export const bioanalistaConfigSchema = z.object({
  nombre: z.string().min(1),
  titulo: z.string().min(1),
  registro_msds: z.string().nullable(),
  registro_cbz: z.string().nullable(),
  firma: z.string().nullable(),
})

export type BioanalistaConfig = z.infer<typeof bioanalistaConfigSchema>

export const printConfigSchema = z.object({
  pageSize: z.enum(['A4', 'Letter']).default('A4'),
  margins: z.object({
    top: z.string(),
    right: z.string(),
    bottom: z.string(),
    left: z.string(),
  }),
  copies: z.number().int().positive().default(1),
})

export type PrintConfig = z.infer<typeof printConfigSchema>

export const configChannels = {
  'config:getLab': {
    request: z.void(),
    response: envelopeSchema(labConfigSchema),
  },
  'config:setLab': {
    request: labConfigSchema,
    response: envelopeSchema(labConfigSchema),
  },
  'config:setBioanalista': {
    request: bioanalistaConfigSchema,
    response: envelopeSchema(bioanalistaConfigSchema),
  },
  'config:setLogo': {
    request: z.object({ logo: z.string().min(1) }),
    response: envelopeSchema(z.string()),
  },
  'config:getPrint': {
    request: z.void(),
    response: envelopeSchema(printConfigSchema),
  },
  'config:setPrint': {
    request: printConfigSchema,
    response: envelopeSchema(printConfigSchema),
  },
} as const

export type ConfigChannels = typeof configChannels
