import type Database from 'better-sqlite3'
import type { CaptureValue, Flag, Result, ResultStatus } from '@/shared/contracts'
import { RESULT_STATUS, RESULT_TYPE } from '@/shared/contracts'
import { toFlag, toIsoString, toResultStatus } from './helpers'

export function rowToResult(row: Record<string, unknown>): Result {
  return {
    id: row.id as number,
    // The v2 contract names this field orden_examen_id, but the current DB
    // schema (001_baseline + 002_rebuild) keeps the v1 column name orden_id.
    // The repository exposes the contract type while using the existing column.
    orden_examen_id: row.orden_id as number,
    parametro_id: row.parametro_id as number,
    valor_numerico: (row.valor_numerico as number | null | undefined) ?? null,
    valor_cualitativo: (row.valor_cualitativo as string | null | undefined) ?? null,
    estatus_validacion: toResultStatus((row.estatus_validacion as string | undefined) ?? 'Pendiente'),
    validado_por: (row.validado_por as number | null | undefined) ?? null,
    validado_en: toIsoString(row.validado_en) ?? null,
    flag: row.flag ? toFlag(row.flag as string) : null,
    comentario: (row.comentario as string | null | undefined) ?? null,
  }
}

export function getResult(db: Database.Database, id: number): Result | null {
  const row = db.prepare('SELECT * FROM resultados WHERE id = ?').get(id) as Record<string, unknown> | undefined
  return row ? rowToResult(row) : null
}

export function listResultsByOrder(db: Database.Database, ordenId: number): Result[] {
  const rows = db
    .prepare('SELECT * FROM resultados WHERE orden_id = ? ORDER BY parametro_id')
    .all(ordenId) as Array<Record<string, unknown>>
  return rows.map(rowToResult)
}

export function listResultsByParameter(db: Database.Database, parametroId: number): Result[] {
  const rows = db
    .prepare('SELECT * FROM resultados WHERE parametro_id = ? ORDER BY id DESC')
    .all(parametroId) as Array<Record<string, unknown>>
  return rows.map(rowToResult)
}

export function createResult(
  db: Database.Database,
  input: {
    orden_id: number
    parametro_id: number
    valor: CaptureValue
    comentario?: string | null
    usuario_id?: number | null
  },
): Result {
  let valorNumerico: number | null = null
  let valorCualitativo: string | null = null
  const estatusValidacion: ResultStatus = RESULT_STATUS.PENDIENTE
  if (input.valor.tipo === RESULT_TYPE.NUMERICO) {
    valorNumerico = input.valor.valor
  } else {
    valorCualitativo = input.valor.valor
  }
  const result = db
    .prepare(
      `INSERT INTO resultados (orden_id, parametro_id, valor_numerico, valor_cualitativo, estatus_validacion, validado_por, flag, comentario)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.orden_id,
      input.parametro_id,
      valorNumerico,
      valorCualitativo,
      estatusValidacion,
      input.usuario_id ?? null,
      null,
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
  db.prepare(
    'UPDATE resultados SET valor_numerico = ?, valor_cualitativo = ?, flag = ?, comentario = ? WHERE id = ?',
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
  const validadoEn = estatus === 'Validado' ? new Date().toISOString() : null
  db.prepare('UPDATE resultados SET estatus_validacion = ?, validado_por = ?, validado_en = ? WHERE id = ?').run(
    estatus,
    validadoPor,
    validadoEn,
    id,
  )
  const res = getResult(db, id)
  if (!res) {
    throw new Error('Result not found after validation update')
  }
  return res
}
