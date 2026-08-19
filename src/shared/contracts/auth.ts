import { z } from 'zod'
import { idSchema, nonemptyStringSchema } from './primitives'
import { ROLES } from './constants'
import { envelopeSchema } from './errors'

const roleSchema = z.enum([
  ROLES.ADMIN,
  ROLES.BIOANALISTA,
  ROLES.TECNICO,
  ROLES.RECEPCION,
])

export const userSchema = z.object({
  id: idSchema,
  usuario: nonemptyStringSchema,
  nombre: nonemptyStringSchema,
  rol: roleSchema,
  activo: z.boolean(),
  debe_cambiar_clave: z.boolean(),
  ultimo_acceso_en: z.string().datetime().nullable(),
})

export type User = z.infer<typeof userSchema>

export const sessionSchema = z.object({
  userId: idSchema,
  usuario: nonemptyStringSchema,
  nombre: nonemptyStringSchema,
  rol: roleSchema,
  loginAt: z.string().datetime(),
  debe_cambiar_clave: z.boolean(),
})

export type Session = z.infer<typeof sessionSchema>

export const loginRequestSchema = z.object({
  usuario: nonemptyStringSchema,
  clave: nonemptyStringSchema,
})

export type LoginRequest = z.infer<typeof loginRequestSchema>

export const changePasswordRequestSchema = z.object({
  actual: nonemptyStringSchema,
  nueva: z.string().min(8, { error: 'Password must be at least 8 characters' }),
})

export type ChangePasswordRequest = z.infer<typeof changePasswordRequestSchema>

export const createUserRequestSchema = z.object({
  usuario: nonemptyStringSchema,
  nombre: nonemptyStringSchema,
  clave: z.string().min(8, { error: 'Password must be at least 8 characters' }),
  rol: roleSchema,
})

export type CreateUserRequest = z.infer<typeof createUserRequestSchema>

export const updateUserRequestSchema = z.object({
  id: idSchema,
  nombre: nonemptyStringSchema.optional(),
  rol: roleSchema.optional(),
  activo: z.boolean().optional(),
})

export type UpdateUserRequest = z.infer<typeof updateUserRequestSchema>

export const resetPasswordRequestSchema = z.object({
  id: idSchema,
  nueva: z.string().min(8, { error: 'Password must be at least 8 characters' }),
  debe_cambiar_clave: z.boolean().default(true),
})

export type ResetPasswordRequest = z.infer<typeof resetPasswordRequestSchema>

export const authChannels = {
  'auth:login': {
    request: loginRequestSchema,
    response: envelopeSchema(sessionSchema),
  },
  'auth:logout': {
    request: z.void(),
    response: envelopeSchema(z.void()),
  },
  'auth:me': {
    request: z.void(),
    response: envelopeSchema(sessionSchema.nullable()),
  },
  'auth:changePassword': {
    request: changePasswordRequestSchema,
    response: envelopeSchema(z.void()),
  },
  'users:list': {
    request: z.void(),
    response: envelopeSchema(z.array(userSchema)),
  },
  'users:create': {
    request: createUserRequestSchema,
    response: envelopeSchema(userSchema),
  },
  'users:update': {
    request: updateUserRequestSchema,
    response: envelopeSchema(userSchema),
  },
  'users:disable': {
    request: z.object({ id: idSchema }),
    response: envelopeSchema(userSchema),
  },
  'users:resetPassword': {
    request: resetPasswordRequestSchema,
    response: envelopeSchema(z.void()),
  },
} as const

export type AuthChannels = typeof authChannels
