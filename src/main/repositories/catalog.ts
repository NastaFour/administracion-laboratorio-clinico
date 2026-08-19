import type Database from 'better-sqlite3'
import type { Exam, ExamInput, Parameter, ParameterInput, ReferenceRange, ReferenceRangeInput } from '@/shared/contracts'
import { fromBoolean, parseJson, stringifyJson, toAgeUnit, toBoolean, toResultType, toSex, toSexScope } from './helpers'

export function rowToExam(row: Record<string, unknown>): Exam {
  return {
    id: row.id as number,
    codigo: row.codigo as string,
    nombre: row.nombre as string,
    categoria: row.categoria as string,
    tipo_muestra: row.muestra as string,
    precio: row.precio as number,
    tercerizado: toBoolean(row.tercerizado as number | null | undefined),
    proveedor: (row.proveedor as string | null | undefined) ?? null,
    activo: toBoolean(row.activo as number | null | undefined),
  }
}

export function rowToParameter(row: Record<string, unknown>): Parameter {
  return {
    id: row.id as number,
    examen_id: row.examen_id as number,
    nombre: row.nombre as string,
    orden: row.orden as number,
    unidad: (row.unidad as string | null | undefined) ?? null,
    tipo_resultado: toResultType(row.tipo_resultado as string),
    opciones_cualitativas: parseJson<string[]>(row.opciones_cualitativas as string | null | undefined),
    activo: toBoolean(row.activo as number | null | undefined),
  }
}

export function rowToReferenceRange(row: Record<string, unknown>): ReferenceRange {
  return {
    id: row.id as number,
    parametro_id: row.parametro_id as number,
    sexo: toSexScope(row.sexo as string),
    edad_unidad: toAgeUnit(row.edad_unidad as string),
    edad_min: row.edad_min as number,
    edad_max: row.edad_max as number,
    valor_min: (row.valor_min as number | null | undefined) ?? null,
    valor_max: (row.valor_max as number | null | undefined) ?? null,
    interpretacion: (row.interpretacion as string | null | undefined) ?? null,
    valor_min_critico: (row.valor_min_critico as number | null | undefined) ?? null,
    valor_max_critico: (row.valor_max_critico as number | null | undefined) ?? null,
    activo: toBoolean(row.activo as number | null | undefined),
  }
}

// Exams ----------------------------------------------------------------------

export function listExams(db: Database.Database, activos = true): Exam[] {
  const rows = db
    .prepare('SELECT * FROM examenes_catalogo WHERE (? = 0 OR activo = 1) ORDER BY categoria, nombre')
    .all(activos ? 1 : 0) as Array<Record<string, unknown>>
  return rows.map(rowToExam)
}

export function getExam(db: Database.Database, id: number): Exam | null {
  const row = db.prepare('SELECT * FROM examenes_catalogo WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined
  return row ? rowToExam(row) : null
}

export function getExamByCode(db: Database.Database, codigo: string): Exam | null {
  const row = db.prepare('SELECT * FROM examenes_catalogo WHERE codigo = ?').get(codigo) as
    | Record<string, unknown>
    | undefined
  return row ? rowToExam(row) : null
}

export function createExam(db: Database.Database, input: ExamInput): Exam {
  const result = db
    .prepare(
      `INSERT INTO examenes_catalogo (codigo, nombre, categoria, muestra, precio, tercerizado, proveedor, activo)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
    )
    .run(
      input.codigo,
      input.nombre,
      input.categoria,
      input.tipo_muestra,
      input.precio,
      fromBoolean(input.tercerizado),
      input.proveedor,
    )
  const id = Number(result.lastInsertRowid)
  const exam = getExam(db, id)
  if (!exam) {
    throw new Error('Exam was not created')
  }
  return exam
}

export function updateExam(db: Database.Database, id: number, changes: Partial<ExamInput>): Exam {
  const sets: string[] = []
  const values: unknown[] = []
  if (changes.codigo !== undefined) {
    sets.push('codigo = ?')
    values.push(changes.codigo)
  }
  if (changes.nombre !== undefined) {
    sets.push('nombre = ?')
    values.push(changes.nombre)
  }
  if (changes.categoria !== undefined) {
    sets.push('categoria = ?')
    values.push(changes.categoria)
  }
  if (changes.tipo_muestra !== undefined) {
    sets.push('muestra = ?')
    values.push(changes.tipo_muestra)
  }
  if (changes.precio !== undefined) {
    sets.push('precio = ?')
    values.push(changes.precio)
  }
  if (changes.tercerizado !== undefined) {
    sets.push('tercerizado = ?')
    values.push(fromBoolean(changes.tercerizado))
  }
  if (changes.proveedor !== undefined) {
    sets.push('proveedor = ?')
    values.push(changes.proveedor)
  }
  if (sets.length === 0) {
    const existing = getExam(db, id)
    if (!existing) {
      throw new Error('Exam not found')
    }
    return existing
  }
  values.push(id)
  db.prepare(`UPDATE examenes_catalogo SET ${sets.join(', ')} WHERE id = ?`).run(...values)
  const exam = getExam(db, id)
  if (!exam) {
    throw new Error('Exam not found after update')
  }
  return exam
}

export function deactivateExam(db: Database.Database, id: number): Exam {
  db.prepare('UPDATE examenes_catalogo SET activo = 0 WHERE id = ?').run(id)
  const exam = getExam(db, id)
  if (!exam) {
    throw new Error('Exam not found after deactivation')
  }
  return exam
}

// Parameters -----------------------------------------------------------------

export function listParams(db: Database.Database, examenId: number, activos = true): Parameter[] {
  const rows = db
    .prepare(
      'SELECT * FROM parametros_examen WHERE examen_id = ? AND (? = 0 OR activo = 1) ORDER BY orden',
    )
    .all(examenId, activos ? 1 : 0) as Array<Record<string, unknown>>
  return rows.map(rowToParameter)
}

export function getParam(db: Database.Database, id: number): Parameter | null {
  const row = db.prepare('SELECT * FROM parametros_examen WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined
  return row ? rowToParameter(row) : null
}

export function createParam(db: Database.Database, input: ParameterInput): Parameter {
  const result = db
    .prepare(
      `INSERT INTO parametros_examen (examen_id, nombre, orden, unidad, tipo_resultado, opciones_cualitativas, activo)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
    )
    .run(
      input.examen_id,
      input.nombre,
      input.orden,
      input.unidad,
      input.tipo_resultado,
      stringifyJson(input.opciones_cualitativas),
    )
  const id = Number(result.lastInsertRowid)
  const param = getParam(db, id)
  if (!param) {
    throw new Error('Parameter was not created')
  }
  return param
}

export function updateParam(db: Database.Database, id: number, changes: Partial<ParameterInput>): Parameter {
  const sets: string[] = []
  const values: unknown[] = []
  if (changes.examen_id !== undefined) {
    sets.push('examen_id = ?')
    values.push(changes.examen_id)
  }
  if (changes.nombre !== undefined) {
    sets.push('nombre = ?')
    values.push(changes.nombre)
  }
  if (changes.orden !== undefined) {
    sets.push('orden = ?')
    values.push(changes.orden)
  }
  if (changes.unidad !== undefined) {
    sets.push('unidad = ?')
    values.push(changes.unidad)
  }
  if (changes.tipo_resultado !== undefined) {
    sets.push('tipo_resultado = ?')
    values.push(changes.tipo_resultado)
  }
  if (changes.opciones_cualitativas !== undefined) {
    sets.push('opciones_cualitativas = ?')
    values.push(stringifyJson(changes.opciones_cualitativas))
  }
  if (sets.length === 0) {
    const existing = getParam(db, id)
    if (!existing) {
      throw new Error('Parameter not found')
    }
    return existing
  }
  values.push(id)
  db.prepare(`UPDATE parametros_examen SET ${sets.join(', ')} WHERE id = ?`).run(...values)
  const param = getParam(db, id)
  if (!param) {
    throw new Error('Parameter not found after update')
  }
  return param
}

export function deactivateParam(db: Database.Database, id: number): Parameter {
  db.prepare('UPDATE parametros_examen SET activo = 0 WHERE id = ?').run(id)
  const param = getParam(db, id)
  if (!param) {
    throw new Error('Parameter not found after deactivation')
  }
  return param
}

// Reference ranges -----------------------------------------------------------

export function listRanges(db: Database.Database, parametroId: number, activos = true): ReferenceRange[] {
  const rows = db
    .prepare(
      'SELECT * FROM valores_referencia WHERE parametro_id = ? AND (? = 0 OR activo = 1) ORDER BY edad_min',
    )
    .all(parametroId, activos ? 1 : 0) as Array<Record<string, unknown>>
  return rows.map(rowToReferenceRange)
}

export function getRange(db: Database.Database, id: number): ReferenceRange | null {
  const row = db.prepare('SELECT * FROM valores_referencia WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined
  return row ? rowToReferenceRange(row) : null
}

export function createRange(db: Database.Database, input: ReferenceRangeInput): ReferenceRange {
  const result = db
    .prepare(
      `INSERT INTO valores_referencia (parametro_id, sexo, edad_unidad, edad_min, edad_max, valor_min, valor_max, interpretacion, valor_min_critico, valor_max_critico, activo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    )
    .run(
      input.parametro_id,
      input.sexo,
      input.edad_unidad,
      input.edad_min,
      input.edad_max,
      input.valor_min,
      input.valor_max,
      input.interpretacion,
      input.valor_min_critico,
      input.valor_max_critico,
    )
  const id = Number(result.lastInsertRowid)
  const range = getRange(db, id)
  if (!range) {
    throw new Error('Reference range was not created')
  }
  return range
}

export function updateRange(db: Database.Database, id: number, changes: Partial<ReferenceRangeInput>): ReferenceRange {
  const sets: string[] = []
  const values: unknown[] = []
  if (changes.parametro_id !== undefined) {
    sets.push('parametro_id = ?')
    values.push(changes.parametro_id)
  }
  if (changes.sexo !== undefined) {
    sets.push('sexo = ?')
    values.push(changes.sexo)
  }
  if (changes.edad_unidad !== undefined) {
    sets.push('edad_unidad = ?')
    values.push(changes.edad_unidad)
  }
  if (changes.edad_min !== undefined) {
    sets.push('edad_min = ?')
    values.push(changes.edad_min)
  }
  if (changes.edad_max !== undefined) {
    sets.push('edad_max = ?')
    values.push(changes.edad_max)
  }
  if (changes.valor_min !== undefined) {
    sets.push('valor_min = ?')
    values.push(changes.valor_min)
  }
  if (changes.valor_max !== undefined) {
    sets.push('valor_max = ?')
    values.push(changes.valor_max)
  }
  if (changes.interpretacion !== undefined) {
    sets.push('interpretacion = ?')
    values.push(changes.interpretacion)
  }
  if (changes.valor_min_critico !== undefined) {
    sets.push('valor_min_critico = ?')
    values.push(changes.valor_min_critico)
  }
  if (changes.valor_max_critico !== undefined) {
    sets.push('valor_max_critico = ?')
    values.push(changes.valor_max_critico)
  }
  if (sets.length === 0) {
    const existing = getRange(db, id)
    if (!existing) {
      throw new Error('Reference range not found')
    }
    return existing
  }
  values.push(id)
  db.prepare(`UPDATE valores_referencia SET ${sets.join(', ')} WHERE id = ?`).run(...values)
  const range = getRange(db, id)
  if (!range) {
    throw new Error('Reference range not found after update')
  }
  return range
}

export function deactivateRange(db: Database.Database, id: number): ReferenceRange {
  db.prepare('UPDATE valores_referencia SET activo = 0 WHERE id = ?').run(id)
  const range = getRange(db, id)
  if (!range) {
    throw new Error('Reference range not found after deactivation')
  }
  return range
}
