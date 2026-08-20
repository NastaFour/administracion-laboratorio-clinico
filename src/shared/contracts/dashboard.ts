import { z } from 'zod'
import { idSchema, isoDateOnlySchema, positiveMoneySchema } from './primitives'
import { envelopeSchema } from './errors'

export const todayKpiSchema = z.object({
  ordenes_hoy: z.number().int().nonnegative(),
  resultados_pendientes: z.number().int().nonnegative(),
  ingreso_bs: positiveMoneySchema,
  ingreso_usd: positiveMoneySchema,
  examenes_por_categoria: z.record(z.string(), z.number().int().nonnegative()),
})

export type TodayKpi = z.infer<typeof todayKpiSchema>

export const debtorBucketSchema = z.object({
  rango: z.enum(['0-30', '31-60', '61-90', '90+']),
  paciente_id: idSchema,
  paciente_nombre: z.string(),
  saldo_bs: positiveMoneySchema,
  saldo_usd: positiveMoneySchema,
  dias_pendientes: z.number().int().nonnegative(),
})

export type DebtorBucket = z.infer<typeof debtorBucketSchema>

export const examStatSchema = z.object({
  examen_id: idSchema,
  examen_nombre: z.string(),
  cantidad: z.number().int().nonnegative(),
  ingreso_bs: positiveMoneySchema,
})

export type ExamStat = z.infer<typeof examStatSchema>

export const monthlyRevenueSchema = z.object({
  mes: z.string(),
  bs: positiveMoneySchema,
  usd: positiveMoneySchema,
})

export type MonthlyRevenue = z.infer<typeof monthlyRevenueSchema>

export const statsSchema = z.object({
  top_examenes: z.array(examStatSchema),
  ingreso_mensual: z.array(monthlyRevenueSchema),
  ingreso_mes_anterior_bs: positiveMoneySchema,
  ingreso_mes_anterior_usd: positiveMoneySchema,
})

export type Stats = z.infer<typeof statsSchema>

export const trendPointSchema = z.object({
  fecha: isoDateOnlySchema,
  valor: z.number(),
  unidad: z.string().nullable(),
})

export type TrendPoint = z.infer<typeof trendPointSchema>

export const trendSchema = z.object({
  paciente_id: idSchema,
  parametro_id: idSchema,
  parametro_nombre: z.string(),
  puntos: z.array(trendPointSchema),
})

export type Trend = z.infer<typeof trendSchema>

export const patientAnalyteSchema = z.object({
  parametro_id: idSchema,
  parametro_nombre: z.string(),
  unidad: z.string().nullable(),
})

export type PatientAnalyte = z.infer<typeof patientAnalyteSchema>

export const dashboardChannels = {
  'dashboard:today': {
    request: z.object({ fecha: isoDateOnlySchema.optional() }),
    response: envelopeSchema(todayKpiSchema),
  },
  'dashboard:debtors': {
    request: z.object({ fechaCorte: isoDateOnlySchema.optional() }),
    response: envelopeSchema(z.array(debtorBucketSchema)),
  },
  'dashboard:stats': {
    request: z.object({ desde: isoDateOnlySchema, hasta: isoDateOnlySchema }),
    response: envelopeSchema(statsSchema),
  },
  'dashboard:trends': {
    request: z.object({ pacienteId: idSchema, parametroId: idSchema }),
    response: envelopeSchema(trendSchema),
  },
  'dashboard:patientAnalytes': {
    request: z.object({ pacienteId: idSchema }),
    response: envelopeSchema(z.array(patientAnalyteSchema)),
  },
} as const

export type DashboardChannels = typeof dashboardChannels
