import { z } from 'zod'
import { idSchema, nonemptyStringSchema, positiveMoneySchema } from './primitives'
import { AGE_UNIT, RESULT_TYPE, SEX } from './constants'
import { envelopeSchema } from './errors'

export const examSchema = z.object({
  id: idSchema,
  codigo: nonemptyStringSchema,
  nombre: nonemptyStringSchema,
  categoria: nonemptyStringSchema,
  tipo_muestra: nonemptyStringSchema,
  precio: positiveMoneySchema,
  tercerizado: z.boolean(),
  proveedor: z.string().nullable(),
  activo: z.boolean(),
})

export type Exam = z.infer<typeof examSchema>

export const examInputSchema = examSchema.omit({ id: true, activo: true })

export type ExamInput = z.infer<typeof examInputSchema>

export const resultTypeSchema = z.enum([RESULT_TYPE.NUMERICO, RESULT_TYPE.CUALITATIVO])

export const parameterSchema = z.object({
  id: idSchema,
  examen_id: idSchema,
  nombre: nonemptyStringSchema,
  orden: z.number().int().nonnegative(),
  unidad: z.string().nullable(),
  tipo_resultado: resultTypeSchema,
  opciones_cualitativas: z.array(z.string()).nullable(),
  activo: z.boolean(),
})

export type Parameter = z.infer<typeof parameterSchema>

export const parameterInputSchema = parameterSchema.omit({ id: true, activo: true })

export type ParameterInput = z.infer<typeof parameterInputSchema>

export const sexScopeSchema = z.enum([SEX.MALE, SEX.FEMALE, 'Ambos'])

export const ageUnitSchema = z.enum([AGE_UNIT.DIAS, AGE_UNIT.MESES, AGE_UNIT.ANIOS])

export const referenceRangeSchema = z.object({
  id: idSchema,
  parametro_id: idSchema,
  sexo: sexScopeSchema,
  edad_unidad: ageUnitSchema,
  edad_min: z.number().int().nonnegative(),
  edad_max: z.number().int().nonnegative(),
  valor_min: z.number().nullable(),
  valor_max: z.number().nullable(),
  interpretacion: z.string().nullable(),
  valor_min_critico: z.number().nullable(),
  valor_max_critico: z.number().nullable(),
  activo: z.boolean(),
})

export type ReferenceRange = z.infer<typeof referenceRangeSchema>

export const referenceRangeInputSchema = referenceRangeSchema.omit({ id: true, activo: true })

export type ReferenceRangeInput = z.infer<typeof referenceRangeInputSchema>

export const catalogChannels = {
  'catalog:listExams': {
    request: z.object({ activos: z.boolean().default(true) }),
    response: envelopeSchema(z.array(examSchema)),
  },
  'catalog:saveExam': {
    request: examInputSchema.extend({ id: idSchema.optional() }),
    response: envelopeSchema(examSchema),
  },
  'catalog:deactivateExam': {
    request: z.object({ id: idSchema }),
    response: envelopeSchema(examSchema),
  },
  'catalog:listParams': {
    request: z.object({ examenId: idSchema }),
    response: envelopeSchema(z.array(parameterSchema)),
  },
  'catalog:saveParam': {
    request: parameterInputSchema.extend({ id: idSchema.optional() }),
    response: envelopeSchema(parameterSchema),
  },
  'catalog:listRanges': {
    request: z.object({ parametroId: idSchema }),
    response: envelopeSchema(z.array(referenceRangeSchema)),
  },
  'catalog:saveRange': {
    request: referenceRangeInputSchema.extend({ id: idSchema.optional() }),
    response: envelopeSchema(referenceRangeSchema),
  },
  'catalog:deactivateRange': {
    request: z.object({ id: idSchema }),
    response: envelopeSchema(referenceRangeSchema),
  },
  'catalog:deactivateParam': {
    request: z.object({ id: idSchema }),
    response: envelopeSchema(parameterSchema),
  },
  'catalog:import': {
    request: z.object({ payload: z.string() }),
    response: envelopeSchema(z.array(z.unknown())),
  },
  'catalog:export': {
    request: z.void(),
    response: envelopeSchema(z.string()),
  },
} as const

export type CatalogChannels = typeof catalogChannels
