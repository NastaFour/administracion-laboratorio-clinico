import type Database from 'better-sqlite3'
import type { Patient, PatientInput } from '@/shared/contracts'
import { toBoolean, toSex } from './helpers'

export function rowToPatient(row: Record<string, unknown>): Patient {
  return {
    id: row.id as number,
    cedula: row.cedula as string,
    nombre: row.nombres as string,
    apellido: row.apellidos as string,
    fecha_nacimiento: row.fecha_nacimiento as string,
    sexo: toSex(row.sexo as string),
    telefono: (row.telefono as string | null | undefined) ?? null,
    email: (row.email as string | null | undefined) ?? null,
    direccion: (row.direccion as string | null | undefined) ?? null,
    activo: toBoolean(row.activo as number | null | undefined),
  }
}

export function listPatients(db: Database.Database, activos = true): Patient[] {
  const rows = db
    .prepare('SELECT * FROM pacientes WHERE (? = 0 OR activo = 1) ORDER BY apellidos, nombres')
    .all(activos ? 1 : 0) as Array<Record<string, unknown>>
  return rows.map(rowToPatient)
}

export function searchPatients(db: Database.Database, query: string, limit = 50): Patient[] {
  const pattern = `%${query}%`
  const rows = db
    .prepare(
      `SELECT * FROM pacientes
       WHERE activo = 1 AND (cedula LIKE ? OR nombres LIKE ? OR apellidos LIKE ? OR telefono LIKE ?)
       ORDER BY apellidos, nombres
       LIMIT ?`,
    )
    .all(pattern, pattern, pattern, pattern, limit) as Array<Record<string, unknown>>
  return rows.map(rowToPatient)
}

export function getPatient(db: Database.Database, id: number): Patient | null {
  const row = db.prepare('SELECT * FROM pacientes WHERE id = ?').get(id) as Record<string, unknown> | undefined
  return row ? rowToPatient(row) : null
}

export function getPatientByCedula(db: Database.Database, cedula: string): Patient | null {
  const row = db.prepare('SELECT * FROM pacientes WHERE cedula = ?').get(cedula) as
    | Record<string, unknown>
    | undefined
  return row ? rowToPatient(row) : null
}

export function createPatient(db: Database.Database, input: PatientInput): Patient {
  const result = db
    .prepare(
      `INSERT INTO pacientes (cedula, nombres, apellidos, fecha_nacimiento, sexo, telefono, email, direccion, activo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    )
    .run(
      input.cedula,
      input.nombre,
      input.apellido,
      input.fecha_nacimiento,
      input.sexo,
      input.telefono,
      input.email,
      input.direccion,
    )
  const id = Number(result.lastInsertRowid)
  const patient = getPatient(db, id)
  if (!patient) {
    throw new Error('Patient was not created')
  }
  return patient
}

export function updatePatient(db: Database.Database, id: number, changes: Partial<PatientInput>): Patient {
  const sets: string[] = []
  const values: unknown[] = []
  if (changes.cedula !== undefined) {
    sets.push('cedula = ?')
    values.push(changes.cedula)
  }
  if (changes.nombre !== undefined) {
    sets.push('nombres = ?')
    values.push(changes.nombre)
  }
  if (changes.apellido !== undefined) {
    sets.push('apellidos = ?')
    values.push(changes.apellido)
  }
  if (changes.fecha_nacimiento !== undefined) {
    sets.push('fecha_nacimiento = ?')
    values.push(changes.fecha_nacimiento)
  }
  if (changes.sexo !== undefined) {
    sets.push('sexo = ?')
    values.push(changes.sexo)
  }
  if (changes.telefono !== undefined) {
    sets.push('telefono = ?')
    values.push(changes.telefono)
  }
  if (changes.email !== undefined) {
    sets.push('email = ?')
    values.push(changes.email)
  }
  if (changes.direccion !== undefined) {
    sets.push('direccion = ?')
    values.push(changes.direccion)
  }
  if (sets.length === 0) {
    const existing = getPatient(db, id)
    if (!existing) {
      throw new Error('Patient not found')
    }
    return existing
  }
  values.push(id)
  db.prepare(`UPDATE pacientes SET ${sets.join(', ')} WHERE id = ?`).run(...values)
  const patient = getPatient(db, id)
  if (!patient) {
    throw new Error('Patient not found after update')
  }
  return patient
}

export function deactivatePatient(db: Database.Database, id: number): Patient {
  db.prepare('UPDATE pacientes SET activo = 0 WHERE id = ?').run(id)
  const patient = getPatient(db, id)
  if (!patient) {
    throw new Error('Patient not found after deactivation')
  }
  return patient
}

/**
 * Sobrescribir merge (M13.5): applies an incoming patient batch inside ONE
 * transaction. Conflicting cédulas overwrite the local row in place — the
 * row identity survives so `ordenes.paciente_id` references stay intact and
 * the UNIQUE(cedula) constraint is never hit. Non-conflicting patients are
 * inserted. A failure anywhere rolls back the whole batch.
 */
export const mergePatientsOverwrite = (db: Database.Database, incoming: PatientInput[]): void => {
  const applyBatch = db.transaction((patients: PatientInput[]) => {
    for (const input of patients) {
      const existing = getPatientByCedula(db, input.cedula)
      if (existing) {
        updatePatient(db, existing.id, input)
      } else {
        createPatient(db, input)
      }
    }
  })
  applyBatch(incoming)
}

export interface PatientHistoryOrder {
  orden_id: number
  estatus: string
  estatus_pago: string
  precio_total: number
  fecha_solicitud: string
  examenes: Array<{
    examen_id: number
    examen_nombre: string
  }>
}

export function getPatientHistory(db: Database.Database, id: number): PatientHistoryOrder[] {
  const orders = db
    .prepare(
      `SELECT id, estatus, estatus_pago, precio_total, fecha_solicitud
       FROM ordenes
       WHERE paciente_id = ?
       ORDER BY fecha_solicitud DESC`,
    )
    .all(id) as Array<{
      id: number
      estatus: string
      estatus_pago: string
      precio_total: number
      fecha_solicitud: string
    }>

  const examStmt = db.prepare(
    `SELECT oe.examen_id, ec.nombre AS examen_nombre
     FROM orden_examenes oe
     JOIN examenes_catalogo ec ON ec.id = oe.examen_id
     WHERE oe.orden_id = ?`,
  )

  return orders.map((order) => ({
    orden_id: order.id,
    estatus: order.estatus,
    estatus_pago: order.estatus_pago,
    precio_total: order.precio_total,
    fecha_solicitud: order.fecha_solicitud,
    examenes: (examStmt.all(order.id) as Array<{
      examen_id: number
      examen_nombre: string
    }>).map((row) => ({
      examen_id: row.examen_id,
      examen_nombre: row.examen_nombre,
    })),
  }))
}

/** Compute patient age in full years from an ISO-8601 date (YYYY-MM-DD) */
function computeAge(fechaNacimiento: string): number {
  const today = new Date()
  const dob = new Date(fechaNacimiento + 'T00:00:00') // local midnight
  let age = today.getFullYear() - dob.getFullYear()
  const m = today.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--
  }
  return Math.max(0, age)
}

export interface PatientDossierResult {
  paciente: {
    id: number
    cedula: string
    nombre: string
    apellido: string
    fecha_nacimiento: string
    sexo: string
    telefono: string | null
    email: string | null
    direccion: string | null
    activo: boolean
    edad: number
  }
  balance: { facturado: number; pagado: number; saldo: number }
  ordenes: Array<{
    orden_id: number
    fecha_solicitud: string
    estatus: string
    estatus_pago: string
    precio_total: number
    saldo: number
    examenes: Array<{ examen_id: number; examen_nombre: string }>
  }>
  pagos: Array<{
    id: number
    orden_id: number
    metodo: string
    monto_bs: number
    monto_usd: number
    fecha: string
    cajero: string
  }>
  resultados: Array<{
    orden_id: number
    examen_nombre: string
    parametro_nombre: string
    valor: string | null
    unidad: string | null
    flag: string | null
  }>
}

export function getPatientDossier(db: Database.Database, pacienteId: number): PatientDossierResult | null {
  // 1. Load patient
  const rawPatient = db.prepare('SELECT * FROM pacientes WHERE id = ?').get(pacienteId) as
    | Record<string, unknown>
    | undefined
  if (!rawPatient) return null
  const patient = rowToPatient(rawPatient)

  // 2. Balance: facturado = SUM precio_total non-void orders, pagado = SUM payments non-void
  const balanceRow = db
    .prepare(
      `SELECT
         COALESCE(SUM(o.precio_total), 0) AS facturado,
         COALESCE((
           SELECT SUM(p.monto_bs)
           FROM pagos p
           JOIN ordenes op ON op.id = p.orden_id
           WHERE op.paciente_id = ? AND p.anulado = 0 AND op.anulada = 0
         ), 0) AS pagado
       FROM ordenes o
       WHERE o.paciente_id = ? AND o.anulada = 0`,
    )
    .get(pacienteId, pacienteId) as { facturado: number; pagado: number }
  const facturado = balanceRow.facturado
  const pagado = balanceRow.pagado

  // 3. Orders with exams — fecha_solicitud normalized to the local business
  // date (isoDateOnly) so the IPC response schema validates.
  const orderRows = db
    .prepare(
      `SELECT id, date(fecha_solicitud) AS fecha_solicitud, estatus, estatus_pago, precio_total,
              COALESCE(precio_total - (
                SELECT COALESCE(SUM(p.monto_bs),0) FROM pagos p WHERE p.orden_id = ordenes.id AND p.anulado = 0
              ), precio_total) AS saldo
       FROM ordenes WHERE paciente_id = ? ORDER BY fecha_solicitud DESC`,
    )
    .all(pacienteId) as Array<{
      id: number
      fecha_solicitud: string
      estatus: string
      estatus_pago: string
      precio_total: number
      saldo: number
    }>

  const examStmt = db.prepare(
    `SELECT oe.examen_id, ec.nombre AS examen_nombre
     FROM orden_examenes oe JOIN examenes_catalogo ec ON ec.id = oe.examen_id
     WHERE oe.orden_id = ?`,
  )

  const ordenes = orderRows.map((o) => ({
    orden_id: o.id,
    fecha_solicitud: o.fecha_solicitud,
    estatus: o.estatus,
    estatus_pago: o.estatus_pago,
    precio_total: o.precio_total,
    saldo: Math.max(0, o.saldo),
    examenes: (
      examStmt.all(o.id) as Array<{ examen_id: number; examen_nombre: string }>
    ).map((e) => ({ examen_id: e.examen_id, examen_nombre: e.examen_nombre })),
  }))

  // 4. Payments (non-void)
  const pagoRows = db
    .prepare(
      `SELECT p.id, p.orden_id, p.metodo, p.monto_bs, p.monto_usd, p.fecha,
              COALESCE(u.nombre_completo, u.username) AS cajero
       FROM pagos p
       JOIN ordenes o ON o.id = p.orden_id
       JOIN usuarios u ON u.id = p.usuario_id
       WHERE o.paciente_id = ? AND p.anulado = 0
       ORDER BY p.fecha DESC`,
    )
    .all(pacienteId) as Array<{
      id: number
      orden_id: number
      metodo: string
      monto_bs: number
      monto_usd: number
      fecha: string
      cajero: string
    }>

  // 5. Results
  const resultRows = db
    .prepare(
      `SELECT oe.orden_id, ec.nombre AS examen_nombre, pe.nombre AS parametro_nombre,
              COALESCE(CAST(r.valor_numerico AS TEXT), r.valor_cualitativo, r.valor_texto) AS valor,
              pe.unidad, r.flag
       FROM resultados r
       JOIN orden_examenes oe ON oe.id = r.orden_examen_id
       JOIN examenes_catalogo ec ON ec.id = oe.examen_id
       JOIN parametros_examen pe ON pe.id = r.parametro_id
       JOIN ordenes o ON o.id = oe.orden_id
       WHERE o.paciente_id = ?
       ORDER BY oe.orden_id DESC, ec.nombre, pe.orden, pe.nombre`,
    )
    .all(pacienteId) as Array<{
      orden_id: number
      examen_nombre: string
      parametro_nombre: string
      valor: string | null
      unidad: string | null
      flag: string | null
    }>

  return {
    paciente: { ...patient, edad: computeAge(patient.fecha_nacimiento) },
    balance: { facturado, pagado, saldo: facturado - pagado },
    ordenes,
    pagos: pagoRows,
    resultados: resultRows,
  }
}

