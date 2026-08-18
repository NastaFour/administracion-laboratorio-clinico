import { z } from 'zod'

/**
 * Primitive schemas reused across domain contracts.
 * All IDs are positive integers; dates cross the IPC boundary as ISO-8601 strings.
 */

export const idSchema = z.number().int().positive({ error: 'ID must be a positive integer' })

export const cedulaSchema = z
  .string()
  .min(1)
  .regex(/^[VE]-\d+$/, { error: 'Cédula must use V- or E- prefix followed by digits' })

export const phoneSchema = z
  .string()
  .min(1)
  .regex(/^\+?[\d\s()-]+$/, { error: 'Phone number format is invalid' })

export const emailSchema = z.email({ error: 'Invalid email address' })

export const isoDateSchema = z.string().datetime({ error: 'Expected ISO-8601 datetime string' })

export const isoDateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { error: 'Expected ISO-8601 date string (YYYY-MM-DD)' })

export const positiveMoneySchema = z.number().min(0).multipleOf(0.01, {
  error: 'Amount must have at most two decimal places',
})

export const nonemptyStringSchema = z.string().min(1, { error: 'This field is required' })

export const nullableIdSchema = z.number().int().positive().nullable()
