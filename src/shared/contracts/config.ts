import { z } from 'zod'
import { emailSchema, phoneSchema, idSchema, positiveMoneySchema } from './primitives'
import { envelopeSchema } from './errors'

/**
 * Lab logo must travel as a base64 data URI (N11.3) — filesystem paths are
 * machine-specific and are rejected so the PDF engine never resolves them.
 */
export const logoDataUriSchema = z
  .string()
  .max(4_000_000, { error: 'Logo image is too large (max ~3 MB)' })
  .regex(/^data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+$/, {
    error: 'Logo must be a base64 image data URI (data:image/*;base64,...)',
  })

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

/**
 * Report layout selector (dual-format PDF system): 'generico' renders the
 * classic 4-column results sheet; 'especializado' renders the microbiology
 * pill-box layout with antibiogram (SPEC-VISUAL-PDF-TEMPLATES §1).
 */
export const reportFormatSchema = z.enum(['generico', 'especializado'])

export type ReportFormat = z.infer<typeof reportFormatSchema>

/** One row of BCV-rate history (M13.2): newest-first entries with actor + timestamp. */
export const bcvRateEntrySchema = z.object({
  tasa: positiveMoneySchema,
  actualizado_en: z.string().datetime(),
  usuario_id: idSchema.nullable(),
})

export type BcvRateEntry = z.infer<typeof bcvRateEntrySchema>

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
  'config:getBioanalista': {
    request: z.void(),
    response: envelopeSchema(bioanalistaConfigSchema),
  },
  'config:setLogo': {
    request: z.object({ logo: logoDataUriSchema }),
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
  'config:getReportFormat': {
    request: z.void(),
    response: envelopeSchema(reportFormatSchema),
  },
  'config:setReportFormat': {
    request: z.object({ formato: reportFormatSchema }),
    response: envelopeSchema(reportFormatSchema),
  },
  'config:getBcvHistory': {
    request: z.void(),
    response: envelopeSchema(z.array(bcvRateEntrySchema)),
  },
} as const

export type ConfigChannels = typeof configChannels
