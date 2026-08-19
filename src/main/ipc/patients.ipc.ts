import type Database from 'better-sqlite3'
import { patientsChannels, ROLES } from '@/shared/contracts'
import { ERROR_CODES } from '@/shared/contracts'
import { handle } from './register'
import {
  createPatient,
  deactivatePatient,
  getPatient,
  getPatientByCedula,
  getPatientHistory,
  listPatients,
  searchPatients,
  updatePatient,
} from '../repositories/patients'
import { writeAudit } from '../services/audit'
import type { Patient, Session } from '@/shared/contracts'
import type { PatientHistoryOrder } from '../repositories/patients'

const PATIENT_ROLES = [ROLES.ADMIN, ROLES.BIOANALISTA, ROLES.TECNICO, ROLES.RECEPCION]

export async function handleListPatients(
  db: Database.Database,
  req: { activos: boolean },
): Promise<Patient[]> {
  return listPatients(db, req.activos)
}

export async function handleSearchPatients(
  db: Database.Database,
  req: { query: string; limit: number },
): Promise<Patient[]> {
  return searchPatients(db, req.query, req.limit)
}

export async function handleGetPatient(
  db: Database.Database,
  req: { id: number },
): Promise<Patient | null> {
  return getPatient(db, req.id)
}

export async function handleCreatePatient(
  db: Database.Database,
  req: Parameters<typeof createPatient>[1],
  session: Session,
): Promise<Patient> {
  const existing = getPatientByCedula(db, req.cedula)
  if (existing) {
    throw new Error(ERROR_CODES.DUPLICATE)
  }

  const patient = createPatient(db, req)
  writeAudit(db, {
    usuario_id: session.userId,
    accion: 'paciente.creado',
    entidad: 'paciente',
    entidad_id: patient.id,
    despues: patient,
  })
  return patient
}

export async function handleUpdatePatient(
  db: Database.Database,
  req: { id: number } & Partial<Parameters<typeof createPatient>[1]>,
  session: Session,
): Promise<Patient> {
  const { id, ...changes } = req
  const before = getPatient(db, id)
  if (!before) {
    throw new Error(ERROR_CODES.NOT_FOUND)
  }

  if (changes.cedula && changes.cedula !== before.cedula) {
    const existing = getPatientByCedula(db, changes.cedula)
    if (existing && existing.id !== id) {
      throw new Error(ERROR_CODES.DUPLICATE)
    }
  }

  const patient = updatePatient(db, id, changes)
  writeAudit(db, {
    usuario_id: session.userId,
    accion: 'paciente.editado',
    entidad: 'paciente',
    entidad_id: patient.id,
    antes: before,
    despues: patient,
  })
  return patient
}

export async function handleDeactivatePatient(
  db: Database.Database,
  req: { id: number },
  session: Session,
): Promise<Patient> {
  const before = getPatient(db, req.id)
  if (!before) {
    throw new Error(ERROR_CODES.NOT_FOUND)
  }

  const patient = deactivatePatient(db, req.id)
  writeAudit(db, {
    usuario_id: session.userId,
    accion: 'paciente.desactivado',
    entidad: 'paciente',
    entidad_id: patient.id,
    antes: before,
    despues: patient,
  })
  return patient
}

export async function handlePatientHistory(
  db: Database.Database,
  req: { id: number },
): Promise<PatientHistoryOrder[]> {
  return getPatientHistory(db, req.id)
}

export async function handleMergePatients(): Promise<never> {
  throw new Error(ERROR_CODES.CONFLICT)
}

export function registerPatientsHandlers(db: Database.Database): void {
  handle(db, 'patients:list', PATIENT_ROLES, patientsChannels['patients:list'].request, handleListPatients)
  handle(db, 'patients:search', PATIENT_ROLES, patientsChannels['patients:search'].request, handleSearchPatients)
  handle(db, 'patients:get', PATIENT_ROLES, patientsChannels['patients:get'].request, handleGetPatient)
  handle(db, 'patients:create', PATIENT_ROLES, patientsChannels['patients:create'].request, handleCreatePatient)
  handle(db, 'patients:update', PATIENT_ROLES, patientsChannels['patients:update'].request, handleUpdatePatient)
  handle(
    db,
    'patients:deactivate',
    PATIENT_ROLES,
    patientsChannels['patients:deactivate'].request,
    handleDeactivatePatient,
  )
  handle(db, 'patients:history', PATIENT_ROLES, patientsChannels['patients:history'].request, handlePatientHistory)
  handle(db, 'patients:merge', PATIENT_ROLES, patientsChannels['patients:merge'].request, handleMergePatients)
}
