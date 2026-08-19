import type Database from 'better-sqlite3'
import { ERROR_CODES, medicosChannels, ROLES } from '@/shared/contracts'
import { handle } from './register'
import { createMedico, deactivateMedico, getMedico, getMedicoByCedula, listMedicos, updateMedico } from '../repositories/medicos'
import { writeAudit } from '../services/audit'
import type { Medico, MedicoInput, Session } from '@/shared/contracts'

const MANAGE_ROLES = [ROLES.ADMIN, ROLES.BIOANALISTA]
const READ_ROLES = [ROLES.ADMIN, ROLES.BIOANALISTA, ROLES.TECNICO, ROLES.RECEPCION]

export async function handleListMedicos(db: Database.Database, req: { activos: boolean }): Promise<Medico[]> {
  return listMedicos(db, req.activos)
}

export async function handleSaveMedico(
  db: Database.Database,
  req: MedicoInput & { id?: number },
  session: Session,
): Promise<Medico> {
  const { id, ...input } = req

  if (id === undefined) {
    if (input.cedula) {
      const existing = getMedicoByCedula(db, input.cedula)
      if (existing) {
        throw new Error(ERROR_CODES.DUPLICATE)
      }
    }
    const medico = createMedico(db, input)
    writeAudit(db, {
      usuario_id: session.userId,
      accion: 'medico.creado',
      entidad: 'medicos_referentes',
      entidad_id: medico.id,
      despues: medico,
    })
    return medico
  }

  const before = getMedico(db, id)
  if (!before) {
    throw new Error(ERROR_CODES.NOT_FOUND)
  }

  if (input.cedula && input.cedula !== before.cedula) {
    const existing = getMedicoByCedula(db, input.cedula)
    if (existing && existing.id !== id) {
      throw new Error(ERROR_CODES.DUPLICATE)
    }
  }

  const medico = updateMedico(db, id, input)
  writeAudit(db, {
    usuario_id: session.userId,
    accion: 'medico.editado',
    entidad: 'medicos_referentes',
    entidad_id: medico.id,
    antes: before,
    despues: medico,
  })
  return medico
}

export async function handleDeactivateMedico(
  db: Database.Database,
  req: { id: number },
  session: Session,
): Promise<Medico> {
  const before = getMedico(db, req.id)
  if (!before) {
    throw new Error(ERROR_CODES.NOT_FOUND)
  }

  const medico = deactivateMedico(db, req.id)
  writeAudit(db, {
    usuario_id: session.userId,
    accion: 'medico.desactivado',
    entidad: 'medicos_referentes',
    entidad_id: medico.id,
    antes: before,
    despues: medico,
  })
  return medico
}

export function registerMedicosHandlers(db: Database.Database): void {
  handle(db, 'medicos:list', READ_ROLES, medicosChannels['medicos:list'].request, handleListMedicos)
  handle(db, 'medicos:save', MANAGE_ROLES, medicosChannels['medicos:save'].request, handleSaveMedico)
  handle(db, 'medicos:deactivate', MANAGE_ROLES, medicosChannels['medicos:deactivate'].request, handleDeactivateMedico)
}
