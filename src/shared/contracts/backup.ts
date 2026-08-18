import { z } from 'zod'
import { isoDateOnlySchema } from './primitives'
import { envelopeSchema } from './errors'

export const backupSchema = z.object({
  path: z.string().min(1),
  creado_en: z.string().datetime(),
  size_bytes: z.number().int().nonnegative(),
})

export type Backup = z.infer<typeof backupSchema>

export const importConflictSchema = z.object({
  tipo: z.enum(['paciente', 'examen']),
  local: z.unknown(),
  incoming: z.unknown(),
})

export type ImportConflict = z.infer<typeof importConflictSchema>

export const importPreviewRequestSchema = z.object({
  filePath: z.string().min(1),
})

export type ImportPreviewRequest = z.infer<typeof importPreviewRequestSchema>

export const importApplyRequestSchema = z.object({
  filePath: z.string().min(1),
  resolutions: z.record(z.string(), z.enum(['skip', 'overwrite', 'keepBoth'])),
})

export type ImportApplyRequest = z.infer<typeof importApplyRequestSchema>

export const exportFilteredRequestSchema = z.object({
  desde: isoDateOnlySchema,
  hasta: isoDateOnlySchema,
  formato: z.enum(['csv', 'json']),
  passphrase: z.string().min(1).nullable().default(null),
})

export type ExportFilteredRequest = z.infer<typeof exportFilteredRequestSchema>

export const backupChannels = {
  'backup:create': {
    request: z.object({ filePath: z.string().min(1) }),
    response: envelopeSchema(backupSchema),
  },
  'backup:list': {
    request: z.void(),
    response: envelopeSchema(z.array(backupSchema)),
  },
  'backup:restore': {
    request: z.object({ filePath: z.string().min(1) }),
    response: envelopeSchema(z.void()),
  },
  'backup:prune': {
    request: z.object({ keep: z.number().int().positive().default(10) }),
    response: envelopeSchema(z.array(backupSchema)),
  },
  'import:preview': {
    request: importPreviewRequestSchema,
    response: envelopeSchema(z.array(importConflictSchema)),
  },
  'import:apply': {
    request: importApplyRequestSchema,
    response: envelopeSchema(z.void()),
  },
  'export:filtered': {
    request: exportFilteredRequestSchema,
    response: envelopeSchema(z.string()),
  },
} as const

export type BackupChannels = typeof backupChannels
