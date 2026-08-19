import type Database from 'better-sqlite3'
import { catalogChannels, ERROR_CODES, ROLES } from '@/shared/contracts'
import { handle } from './register'
import {
  createExam,
  createParam,
  createRange,
  deactivateExam,
  deactivateParam,
  getExam,
  getExamByCode,
  getParam,
  listExams,
  listParams,
  updateExam,
  updateParam,
} from '../repositories/catalog'
import { writeAudit } from '../services/audit'
import type { Exam, ExamInput, Parameter, ParameterInput, ReferenceRange, ReferenceRangeInput, Session } from '@/shared/contracts'

const MANAGE_ROLES = [ROLES.ADMIN, ROLES.BIOANALISTA]
const READ_ROLES = [ROLES.ADMIN, ROLES.BIOANALISTA, ROLES.TECNICO, ROLES.RECEPCION]

export async function handleListExams(
  db: Database.Database,
  req: { activos: boolean },
): Promise<Exam[]> {
  return listExams(db, req.activos)
}

export async function handleSaveExam(
  db: Database.Database,
  req: ExamInput & { id?: number },
  session: Session,
): Promise<Exam> {
  const { id, ...input } = req

  if (id === undefined) {
    const existing = getExamByCode(db, input.codigo)
    if (existing) {
      throw new Error(ERROR_CODES.DUPLICATE)
    }
    const exam = createExam(db, input)
    writeAudit(db, {
      usuario_id: session.userId,
      accion: 'catalogo.examen.creado',
      entidad: 'examenes_catalogo',
      entidad_id: exam.id,
      despues: exam,
    })
    return exam
  }

  const before = getExam(db, id)
  if (!before) {
    throw new Error(ERROR_CODES.NOT_FOUND)
  }

  if (input.codigo && input.codigo !== before.codigo) {
    const existing = getExamByCode(db, input.codigo)
    if (existing && existing.id !== id) {
      throw new Error(ERROR_CODES.DUPLICATE)
    }
  }

  const exam = updateExam(db, id, input)
  writeAudit(db, {
    usuario_id: session.userId,
    accion: 'catalogo.examen.editado',
    entidad: 'examenes_catalogo',
    entidad_id: exam.id,
    antes: before,
    despues: exam,
  })
  return exam
}

export async function handleDeactivateExam(
  db: Database.Database,
  req: { id: number },
  session: Session,
): Promise<Exam> {
  const before = getExam(db, req.id)
  if (!before) {
    throw new Error(ERROR_CODES.NOT_FOUND)
  }

  const exam = deactivateExam(db, req.id)
  writeAudit(db, {
    usuario_id: session.userId,
    accion: 'catalogo.examen.desactivado',
    entidad: 'examenes_catalogo',
    entidad_id: exam.id,
    antes: before,
    despues: exam,
  })
  return exam
}

export async function handleListParams(
  db: Database.Database,
  req: { examenId: number },
): Promise<Parameter[]> {
  return listParams(db, req.examenId, true)
}

export async function handleSaveParam(
  db: Database.Database,
  req: ParameterInput & { id?: number },
  session: Session,
): Promise<Parameter> {
  const { id, ...input } = req

  if (id === undefined) {
    const param = createParam(db, input)
    writeAudit(db, {
      usuario_id: session.userId,
      accion: 'catalogo.parametro.creado',
      entidad: 'parametros_examen',
      entidad_id: param.id,
      despues: param,
    })
    return param
  }

  const before = getParam(db, id)
  if (!before) {
    throw new Error(ERROR_CODES.NOT_FOUND)
  }

  const param = updateParam(db, id, input)
  writeAudit(db, {
    usuario_id: session.userId,
    accion: 'catalogo.parametro.editado',
    entidad: 'parametros_examen',
    entidad_id: param.id,
    antes: before,
    despues: param,
  })
  return param
}

export async function handleDeactivateParam(
  db: Database.Database,
  req: { id: number },
  session: Session,
): Promise<Parameter> {
  const before = getParam(db, req.id)
  if (!before) {
    throw new Error(ERROR_CODES.NOT_FOUND)
  }

  const param = deactivateParam(db, req.id)
  writeAudit(db, {
    usuario_id: session.userId,
    accion: 'catalogo.parametro.desactivado',
    entidad: 'parametros_examen',
    entidad_id: param.id,
    antes: before,
    despues: param,
  })
  return param
}

export async function handleSaveRange(
  db: Database.Database,
  req: ReferenceRangeInput & { id?: number },
): Promise<ReferenceRange> {
  const { id, ...input } = req

  if (id === undefined) {
    return createRange(db, input)
  }

  throw new Error(ERROR_CODES.CONFLICT)
}

export async function handleImportCatalog(): Promise<never> {
  throw new Error(ERROR_CODES.CONFLICT)
}

export async function handleExportCatalog(): Promise<never> {
  throw new Error(ERROR_CODES.CONFLICT)
}

export function registerCatalogHandlers(db: Database.Database): void {
  handle(db, 'catalog:listExams', READ_ROLES, catalogChannels['catalog:listExams'].request, handleListExams)
  handle(db, 'catalog:saveExam', MANAGE_ROLES, catalogChannels['catalog:saveExam'].request, handleSaveExam)
  handle(
    db,
    'catalog:deactivateExam',
    MANAGE_ROLES,
    catalogChannels['catalog:deactivateExam'].request,
    handleDeactivateExam,
  )
  handle(db, 'catalog:listParams', READ_ROLES, catalogChannels['catalog:listParams'].request, handleListParams)
  handle(db, 'catalog:saveParam', MANAGE_ROLES, catalogChannels['catalog:saveParam'].request, handleSaveParam)
  handle(
    db,
    'catalog:deactivateParam',
    MANAGE_ROLES,
    catalogChannels['catalog:deactivateParam'].request,
    handleDeactivateParam,
  )
  handle(db, 'catalog:saveRange', MANAGE_ROLES, catalogChannels['catalog:saveRange'].request, handleSaveRange)
  handle(db, 'catalog:import', MANAGE_ROLES, catalogChannels['catalog:import'].request, handleImportCatalog)
  handle(db, 'catalog:export', READ_ROLES, catalogChannels['catalog:export'].request, handleExportCatalog)
}
