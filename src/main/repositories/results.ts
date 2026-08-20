import type Database from 'better-sqlite3'
import type { CaptureValue, Flag, Result, ResultStatus } from '@/shared/contracts'
import { ERROR_CODES, RESULT_STATUS, RESULT_TYPE } from '@/shared/contracts'
import { toFlag, toIsoString, toResultStatus } from './helpers'

export function rowToResult(row: Record<string, unknown>): Result {
  return {
    id: row.id as number,
    orden_examen_id: row.orden_examen_id as number,
    parametro_id: row.parametro_id as number,
    valor_numerico: (row.valor_numerico as number | null | undefined) ?? null,
    valor_cualitativo: (row.valor_cualitativo as string | null | undefined) ?? null,
    estatus_validacion: toResultStatus((row.estatus_validacion as string | undefined) ?? 'Pendiente'),
    validado_por: (row.validado_por as number | null | undefined) ?? null,
    validado_en: toIsoString(row.validado_en) ?? null,
    flag: row.flag ? toFlag(row.flag as string) : null,
    comentario: (row.comentario as string | null | undefined) ?? null,
    motivo_rechazo: (row.motivo_rechazo as string | null | undefined) ?? null,
  }
}

export function getResult(db: Database.Database, id: number): Result | null {
  const row = db.prepare('SELECT * FROM resultados WHERE id = ?').get(id) as Record<string, unknown> | undefined
  return row ? rowToResult(row) : null
}

export function requireResult(db: Database.Database, id: number): Result {
  const result = getResult(db, id)
  if (!result) {
    throw new Error(ERROR_CODES.NOT_FOUND)
  }
  return result
}

export function getResultByOrderExamAndParam(
  db: Database.Database,
  ordenExamenId: number,
  parametroId: number,
): Result | null {
  const row = db
    .prepare('SELECT * FROM resultados WHERE orden_examen_id = ? AND parametro_id = ? LIMIT 1')
    .get(ordenExamenId, parametroId) as Record<string, unknown> | undefined
  return row ? rowToResult(row) : null
}

export function listResultsByOrder(db: Database.Database, ordenId: number): Result[] {
  const rows = db
    .prepare(
      `SELECT r.* FROM resultados r
       JOIN orden_examenes oe ON oe.id = r.orden_examen_id
       WHERE oe.orden_id = ?
       ORDER BY r.parametro_id`,
    )
    .all(ordenId) as Array<Record<string, unknown>>
  return rows.map(rowToResult)
}

export function listResultsByOrderExam(db: Database.Database, ordenExamenId: number): Result[] {
  const rows = db
    .prepare('SELECT * FROM resultados WHERE orden_examen_id = ? ORDER BY parametro_id')
    .all(ordenExamenId) as Array<Record<string, unknown>>
  return rows.map(rowToResult)
}

export function listResultsByParameter(db: Database.Database, parametroId: number): Result[] {
  const rows = db
    .prepare('SELECT * FROM resultados WHERE parametro_id = ? ORDER BY id DESC')
    .all(parametroId) as Array<Record<string, unknown>>
  return rows.map(rowToResult)
}

export interface CreateResultInput {
  orden_examen_id: number
  parametro_id: number
  valor: CaptureValue
  estatus: ResultStatus
  validado_por?: number | null
  flag?: Flag | null
  comentario?: string | null
}

export function createResult(db: Database.Database, input: CreateResultInput): Result {
  let valorNumerico: number | null = null
  let valorCualitativo: string | null = null
  if (input.valor.tipo === RESULT_TYPE.NUMERICO) {
    valorNumerico = input.valor.valor
  } else {
    valorCualitativo = input.valor.valor
  }
  const validadoEn = input.estatus === RESULT_STATUS.VALIDADO ? new Date().toISOString() : null
  const result = db
    .prepare(
      `INSERT INTO resultados (orden_examen_id, parametro_id, valor_numerico, valor_cualitativo, estatus_validacion, validado_por, validado_en, flag, comentario)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.orden_examen_id,
      input.parametro_id,
      valorNumerico,
      valorCualitativo,
      input.estatus,
      input.validado_por ?? null,
      validadoEn,
      input.flag ?? null,
      input.comentario ?? null,
    )
  const id = Number(result.lastInsertRowid)
  const res = getResult(db, id)
  if (!res) {
    throw new Error('Result was not created')
  }
  return res
}

export function updateResultValue(
  db: Database.Database,
  id: number,
  input: {
    valor: CaptureValue
    comentario?: string | null
    flag?: Flag | null
  },
): Result {
  let valorNumerico: number | null = null
  let valorCualitativo: string | null = null
  if (input.valor.tipo === RESULT_TYPE.NUMERICO) {
    valorNumerico = input.valor.valor
  } else {
    valorCualitativo = input.valor.valor
  }
  // A fresh capture clears any previous rejection reason.
  db.prepare(
    'UPDATE resultados SET valor_numerico = ?, valor_cualitativo = ?, flag = ?, comentario = ?, motivo_rechazo = NULL WHERE id = ?',
  ).run(valorNumerico, valorCualitativo, input.flag ?? null, input.comentario ?? null, id)
  const res = getResult(db, id)
  if (!res) {
    throw new Error('Result not found after update')
  }
  return res
}

export function setResultValidation(
  db: Database.Database,
  id: number,
  estatus: ResultStatus,
  validadoPor: number | null,
): Result {
  const validadoEn = estatus === RESULT_STATUS.VALIDADO ? new Date().toISOString() : null
  db.prepare(
    'UPDATE resultados SET estatus_validacion = ?, validado_por = ?, validado_en = ?, motivo_rechazo = NULL WHERE id = ?',
  ).run(estatus, validadoPor, validadoEn, id)
  const res = getResult(db, id)
  if (!res) {
    throw new Error('Result not found after validation update')
  }
  return res
}

export function setResultMotivoRechazo(db: Database.Database, id: number, motivo: string): Result {
  db.prepare('UPDATE resultados SET motivo_rechazo = ? WHERE id = ?').run(motivo, id)
  const res = getResult(db, id)
  if (!res) {
    throw new Error('Result not found after rejection update')
  }
  return res
}

export function setResultComment(db: Database.Database, id: number, comentario: string): Result {
  db.prepare('UPDATE resultados SET comentario = ? WHERE id = ?').run(comentario, id)
  const res = getResult(db, id)
  if (!res) {
    throw new Error('Result not found after comment update')
  }
  return res
}
