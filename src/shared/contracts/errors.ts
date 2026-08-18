import { z } from 'zod'

/**
 * Error codes returned inside every IPC response envelope.
 * Kept as a const object so runtime code can reference them safely.
 */
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  NOT_FOUND: 'NOT_FOUND',
  DUPLICATE: 'DUPLICATE',
  CONFLICT: 'CONFLICT',
  DB_ERROR: 'DB_ERROR',
} as const

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES]

const errorSchema = z.object({
  code: z.enum([
    ERROR_CODES.VALIDATION_ERROR,
    ERROR_CODES.PERMISSION_DENIED,
    ERROR_CODES.NOT_FOUND,
    ERROR_CODES.DUPLICATE,
    ERROR_CODES.CONFLICT,
    ERROR_CODES.DB_ERROR,
  ]),
  message: z.string().min(1),
})

export type ApiError = z.infer<typeof errorSchema>

/**
 * Build a discriminated union envelope for a given data schema.
 * Every channel response uses this shape.
 */
export function envelopeSchema<TData>(dataSchema: z.ZodType<TData>) {
  return z.discriminatedUnion('ok', [
    z.object({
      ok: z.literal(true),
      data: dataSchema,
    }),
    z.object({
      ok: z.literal(false),
      error: errorSchema,
    }),
  ])
}

export type SuccessEnvelope<TData> = { ok: true; data: TData }
export type ErrorEnvelope = { ok: false; error: ApiError }
export type Envelope<TData> = SuccessEnvelope<TData> | ErrorEnvelope

export function ok<TData>(data: TData): SuccessEnvelope<TData> {
  return { ok: true, data }
}

export function err(code: ErrorCode, message: string): ErrorEnvelope {
  return { ok: false, error: { code, message } }
}
