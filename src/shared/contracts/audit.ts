import { z } from 'zod'
import { idSchema, isoDateOnlySchema } from './primitives'
import { envelopeSchema } from './errors'

export const auditActionSchema = z.enum([
  'login',
  'logout',
  'permiso.denegado',
  'clave.cambiada',
  'paciente.creado',
  'paciente.editado',
  'paciente.desactivado',
  'orden.creada',
  'orden.editada',
  'orden.anulada',
  'orden.estatus.avanzado',
  'orden.entregada',
  'orden.credito.autorizado',
  'medico.creado',
  'medico.editado',
  'medico.desactivado',
  'muestra.registrada',
  'muestra.estatus.actualizado',
  'muestra.rechazada',
  'resultado.capturado',
  'resultado.validado',
  'resultado.rechazado',
  'resultado.reabierto',
  'pago.registrado',
  'pago.anulado',
  'config.cambiada',
  'usuario.creado',
  'usuario.editado',
  'usuario.deshabilitado',
  'catalogo.examen.creado',
  'catalogo.examen.editado',
  'catalogo.examen.desactivado',
  'catalogo.parametro.creado',
  'catalogo.parametro.editado',
  'catalogo.parametro.desactivado',
  'catalogo.rango.creado',
  'catalogo.rango.editado',
  'catalogo.rango.desactivado',
  'reporte.impreso',
  'import.aplicado',
  'export.generado',
])

export type AuditAction = z.infer<typeof auditActionSchema>

export const auditEntitySchema = z.enum([
  'paciente',
  'orden',
  'medicos_referentes',
  'muestras',
  'resultado',
  'pago',
  'config',
  'usuario',
  'backup',
  'import',
  'export',
  'examenes_catalogo',
  'parametros_examen',
  'valores_referencia',
])

export type AuditEntity = z.infer<typeof auditEntitySchema>

export const auditEntrySchema = z.object({
  id: idSchema,
  usuario_id: idSchema,
  accion: auditActionSchema,
  entidad: auditEntitySchema,
  entidad_id: idSchema.nullable(),
  antes: z.unknown().nullable(),
  despues: z.unknown().nullable(),
  creado_en: z.string().datetime(),
})

export type AuditEntry = z.infer<typeof auditEntrySchema>

export const auditFiltersSchema = z.object({
  usuarioId: idSchema.optional(),
  accion: auditActionSchema.optional(),
  entidad: auditEntitySchema.optional(),
  desde: isoDateOnlySchema.optional(),
  hasta: isoDateOnlySchema.optional(),
})

export type AuditFilters = z.infer<typeof auditFiltersSchema>

export const auditChannels = {
  'audit:list': {
    request: auditFiltersSchema,
    response: envelopeSchema(z.array(auditEntrySchema)),
  },
} as const

export type AuditChannels = typeof auditChannels
