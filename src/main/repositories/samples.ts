import type Database from 'better-sqlite3'
import type { Sample, SampleStatus } from '@/shared/contracts'
import { toIsoString, toSampleStatus } from './helpers'

export function rowToSample(row: Record<string, unknown>): Sample {
  return {
    id: row.id as number,
    orden_examen_id: row.orden_examen_id as number,
    tipo_muestra: row.tipo_muestra as string,
    codigo: row.codigo as string,
    estatus: toSampleStatus(row.estatus as string),
    motivo_rechazo: (row.motivo_rechazo as string | null | undefined) ?? null,
    creado_en: toIsoString(row.creado_en) ?? (row.creado_en as string),
  }
}

export function getSample(db: Database.Database, id: number): Sample | null {
  const row = db.prepare('SELECT * FROM muestras WHERE id = ?').get(id) as Record<string, unknown> | undefined
  return row ? rowToSample(row) : null
}

export function listSamplesByOrder(db: Database.Database, ordenId: number): Sample[] {
  const rows = db
    .prepare(
      `SELECT m.* FROM muestras m
       JOIN orden_examenes oe ON oe.id = m.orden_examen_id
       WHERE oe.orden_id = ?
       ORDER BY m.creado_en`,
    )
    .all(ordenId) as Array<Record<string, unknown>>
  return rows.map(rowToSample)
}

export function listSamplesByOrderExam(db: Database.Database, ordenExamenId: number): Sample[] {
  const rows = db
    .prepare('SELECT * FROM muestras WHERE orden_examen_id = ? ORDER BY creado_en')
    .all(ordenExamenId) as Array<Record<string, unknown>>
  return rows.map(rowToSample)
}

function generateSampleCode(ordenExamenId: number, index: number): string {
  return `SM-${ordenExamenId.toString().padStart(6, '0')}-${index.toString().padStart(3, '0')}`
}

export function registerSamplesForOrder(db: Database.Database, ordenId: number): Sample[] {
  const orderExams = db
    .prepare('SELECT id, examen_id FROM orden_examenes WHERE orden_id = ?')
    .all(ordenId) as Array<{ id: number; examen_id: number }>

  const insert = db.prepare(
    'INSERT INTO muestras (orden_examen_id, tipo_muestra, codigo, estatus) VALUES (?, ?, ?, ?)',
  )
  const samples: Sample[] = []

  for (const [index, orderExam] of orderExams.entries()) {
    const examRow = db.prepare('SELECT muestra FROM examenes_catalogo WHERE id = ?').get(orderExam.examen_id) as
      | { muestra: string }
      | undefined
    const tipoMuestra = examRow?.muestra ?? 'Sangre'
    const codigo = generateSampleCode(orderExam.id, index + 1)
    const result = insert.run(orderExam.id, tipoMuestra, codigo, 'Recolectada')
    const sampleId = Number(result.lastInsertRowid)
    const sample = getSample(db, sampleId)
    if (!sample) {
      throw new Error('Sample was not created')
    }
    samples.push(sample)
  }

  return samples
}

export function updateSampleStatus(db: Database.Database, id: number, estatus: SampleStatus): Sample {
  db.prepare('UPDATE muestras SET estatus = ? WHERE id = ?').run(estatus, id)
  const sample = getSample(db, id)
  if (!sample) {
    throw new Error('Sample not found after status update')
  }
  return sample
}

export function rejectSample(db: Database.Database, id: number, motivo: string): Sample {
  db.prepare("UPDATE muestras SET estatus = 'Rechazada', motivo_rechazo = ? WHERE id = ?").run(motivo, id)
  const sample = getSample(db, id)
  if (!sample) {
    throw new Error('Sample not found after rejection')
  }
  return sample
}
