import type Database from 'better-sqlite3'
import { ERROR_CODES, samplesChannels, ROLES } from '@/shared/contracts'
import { handle } from './register'
import {
  generateSampleLabelHtml,
  getSample,
  listSamplesByOrder,
  registerSamplesForOrder,
  rejectSample,
  updateSampleStatus,
} from '../repositories/samples'
import { writeAudit } from '../services/audit'
import type { Sample, SampleStatus, Session } from '@/shared/contracts'

const MANAGE_ROLES = [ROLES.ADMIN, ROLES.BIOANALISTA, ROLES.TECNICO]
const READ_ROLES = [ROLES.ADMIN, ROLES.BIOANALISTA, ROLES.TECNICO, ROLES.RECEPCION]

function requireSample(db: Database.Database, id: number): Sample {
  const sample = getSample(db, id)
  if (!sample) {
    throw new Error(ERROR_CODES.NOT_FOUND)
  }
  return sample
}

export async function handleRegisterSamples(
  db: Database.Database,
  req: { ordenId: number; recoleccion_en?: string },
  session: Session,
): Promise<Sample[]> {
  const samples = registerSamplesForOrder(db, req.ordenId, { recoleccion_en: req.recoleccion_en })
  writeAudit(db, {
    usuario_id: session.userId,
    accion: 'muestra.registrada',
    entidad: 'muestras',
    entidad_id: samples[0]?.id ?? req.ordenId,
    despues: { orden_id: req.ordenId, count: samples.length, samples },
  })
  return samples
}

export async function handleListSamples(db: Database.Database, req: { ordenId: number }): Promise<Sample[]> {
  return listSamplesByOrder(db, req.ordenId)
}

export async function handleUpdateSampleStatus(
  db: Database.Database,
  req: { id: number; estatus: SampleStatus; recoleccion_en?: string },
  session: Session,
): Promise<Sample> {
  const before = requireSample(db, req.id)
  const sample = updateSampleStatus(db, req.id, req.estatus, { recoleccion_en: req.recoleccion_en })
  writeAudit(db, {
    usuario_id: session.userId,
    accion: 'muestra.estatus.actualizado',
    entidad: 'muestras',
    entidad_id: sample.id,
    antes: { estatus: before.estatus, recoleccion_en: before.recoleccion_en },
    despues: { estatus: sample.estatus, recoleccion_en: sample.recoleccion_en },
  })
  return sample
}

export async function handleRejectSample(
  db: Database.Database,
  req: { id: number; motivo: string },
  session: Session,
): Promise<Sample> {
  const before = requireSample(db, req.id)
  const sample = rejectSample(db, req.id, req.motivo)
  writeAudit(db, {
    usuario_id: session.userId,
    accion: 'muestra.rechazada',
    entidad: 'muestras',
    entidad_id: sample.id,
    antes: { estatus: before.estatus, motivo_rechazo: before.motivo_rechazo },
    despues: { estatus: sample.estatus, motivo_rechazo: sample.motivo_rechazo },
  })
  return sample
}

export async function handleSampleLabel(db: Database.Database, req: { id: number }): Promise<string> {
  const sample = requireSample(db, req.id)
  return generateSampleLabelHtml(sample)
}

export function registerSamplesHandlers(db: Database.Database): void {
  handle(db, 'samples:register', MANAGE_ROLES, samplesChannels['samples:register'].request, handleRegisterSamples)
  handle(db, 'samples:list', READ_ROLES, samplesChannels['samples:list'].request, handleListSamples)
  handle(db, 'samples:updateStatus', MANAGE_ROLES, samplesChannels['samples:updateStatus'].request, handleUpdateSampleStatus)
  handle(db, 'samples:reject', MANAGE_ROLES, samplesChannels['samples:reject'].request, handleRejectSample)
  handle(db, 'samples:label', READ_ROLES, samplesChannels['samples:label'].request, handleSampleLabel)
}
