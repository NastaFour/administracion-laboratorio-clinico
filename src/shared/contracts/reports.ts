import { z } from 'zod'
import { idSchema } from './primitives'
import { envelopeSchema } from './errors'

export const reportActionSchema = z.enum(['preview', 'print', 'savePdf'])

export const reportRequestSchema = z.object({
  ordenId: idSchema,
  copia: z.boolean().default(false),
})

export type ReportRequest = z.infer<typeof reportRequestSchema>

export const reportsChannels = {
  'reports:preview': {
    request: reportRequestSchema,
    response: envelopeSchema(z.string()),
  },
  'reports:print': {
    request: reportRequestSchema,
    response: envelopeSchema(z.void()),
  },
  'reports:savePdf': {
    // filePath is optional: when omitted the main process shows the native
    // save dialog (WU12 history re-export).
    request: reportRequestSchema.extend({ filePath: z.string().min(1).optional() }),
    response: envelopeSchema(z.void()),
  },
} as const

export type ReportsChannels = typeof reportsChannels
