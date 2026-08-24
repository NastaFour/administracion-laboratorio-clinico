import { z } from 'zod'
import { isoDateOnlySchema } from './primitives'
import { envelopeSchema } from './errors'
import { patientInputSchema, patientSchema } from './patients'
import { examInputSchema, examSchema } from './catalog'

export const backupSchema = z.object({
  path: z.string().min(1),
  creado_en: z.string().datetime(),
  size_bytes: z.number().int().nonnegative(),
})

export type Backup = z.infer<typeof backupSchema>

/**
 * Conflict preview entry. `id` is the stable resolution key the renderer echoes
 * back in `import:apply` (`resolutions` map): the patient cédula for patient
 * conflicts and the exam código for exam conflicts.
 */
const patientConflictSchema = z.object({
  id: z.string().min(1),
  tipo: z.literal('paciente'),
  cedula: z.string().min(1),
  local: patientSchema.nullable(),
  incoming: patientInputSchema,
})

const examConflictSchema = z.object({
  id: z.string().min(1),
  tipo: z.literal('examen'),
  codigo: z.string().min(1),
  local: examSchema.nullable(),
  incoming: examInputSchema,
})

export const importConflictSchema = z.discriminatedUnion('tipo', [patientConflictSchema, examConflictSchema])

export type ImportConflict = z.infer<typeof importConflictSchema>

/**
 * Shape of the import/merge file (M14.4). Patients and exam catalog are the two
 * mergeable domains; the file carries both arrays. Missing arrays default to
 * empty so a patients-only or catalog-only file is valid.
 */
export const importFileSchema = z.object({
  pacientes: z.array(patientInputSchema).default([]),
  examenes: z.array(examInputSchema).default([]),
})

export type ImportFile = z.infer<typeof importFileSchema>

export const RESOLUTION = {
  SKIP: 'skip',
  OVERWRITE: 'overwrite',
  KEEP_BOTH: 'keepBoth',
} as const

export type ConflictResolution = (typeof RESOLUTION)[keyof typeof RESOLUTION]

export const conflictResolutionSchema = z.enum([RESOLUTION.SKIP, RESOLUTION.OVERWRITE, RESOLUTION.KEEP_BOTH])

export const importPreviewRequestSchema = z.object({
  filePath: z.string().min(1),
})

export type ImportPreviewRequest = z.infer<typeof importPreviewRequestSchema>

export const importApplyRequestSchema = z.object({
  filePath: z.string().min(1),
  resolutions: z.record(z.string(), conflictResolutionSchema),
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
