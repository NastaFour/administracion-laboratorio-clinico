import type Database from 'better-sqlite3'
import { ERROR_CODES, type Sample, type SampleStatus } from '@/shared/contracts'
import { toIsoString, toSampleStatus } from './helpers'

export function rowToSample(row: Record<string, unknown>): Sample {
  return {
    id: row.id as number,
    orden_examen_id: row.orden_examen_id as number,
    tipo_muestra: row.tipo_muestra as string,
    codigo: row.codigo as string,
    estatus: toSampleStatus(row.estatus as string),
    motivo_rechazo: (row.motivo_rechazo as string | null | undefined) ?? null,
    recoleccion_en: toIsoString(row.recoleccion_en),
    creado_en: toIsoString(row.creado_en) ?? (row.creado_en as string),
  }
}

export function getSample(db: Database.Database, id: number): Sample | null {
  const row = db.prepare('SELECT * FROM muestras WHERE id = ?').get(id) as Record<string, unknown> | undefined
  return row ? rowToSample(row) : null
}

export function getSampleByOrderExam(db: Database.Database, ordenExamenId: number): Sample | null {
  const row = db
    .prepare('SELECT * FROM muestras WHERE orden_examen_id = ? ORDER BY id DESC LIMIT 1')
    .get(ordenExamenId) as Record<string, unknown> | undefined
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

function generateSampleCode(ordenExamenId: number, occurrence: number): string {
  return `SM-${ordenExamenId.toString().padStart(6, '0')}-${occurrence.toString().padStart(3, '0')}`
}

export interface RegisterSamplesOptions {
  recoleccion_en?: string
}

export function registerSamplesForOrder(
  db: Database.Database,
  ordenId: number,
  options: RegisterSamplesOptions = {},
): Sample[] {
  const orderExams = db
    .prepare('SELECT id, examen_id FROM orden_examenes WHERE orden_id = ?')
    .all(ordenId) as Array<{ id: number; examen_id: number }>

  // M6.1: one active sample row per exam. Re-registration is only allowed once
  // every existing sample for the order has been rejected (re-collection).
  const active = db
    .prepare(
      `SELECT m.id FROM muestras m
       JOIN orden_examenes oe ON oe.id = m.orden_examen_id
       WHERE oe.orden_id = ? AND m.estatus != 'Rechazada'
       LIMIT 1`,
    )
    .get(ordenId)
  if (active) {
    throw new Error(ERROR_CODES.CONFLICT)
  }

  const insert = db.prepare(
    'INSERT INTO muestras (orden_examen_id, tipo_muestra, codigo, estatus, recoleccion_en) VALUES (?, ?, ?, ?, ?)',
  )
  const samples: Sample[] = []
  const recoleccion = options.recoleccion_en ?? null

  for (const orderExam of orderExams) {
    const examRow = db.prepare('SELECT muestra FROM examenes_catalogo WHERE id = ?').get(orderExam.examen_id) as
      | { muestra: string }
      | undefined
    const tipoMuestra = examRow?.muestra ?? 'Sangre'
    // Occurrence-based code keeps first registration stable (-001) and stays
    // unique across re-collections after rejection (muestras.codigo is UNIQUE).
    const existing = db
      .prepare('SELECT COUNT(*) as count FROM muestras WHERE orden_examen_id = ?')
      .get(orderExam.id) as { count: number }
    const codigo = generateSampleCode(orderExam.id, existing.count + 1)
    const result = insert.run(orderExam.id, tipoMuestra, codigo, 'Recolectada', recoleccion)
    const sampleId = Number(result.lastInsertRowid)
    const sample = getSample(db, sampleId)
    if (!sample) {
      throw new Error('Sample was not created')
    }
    samples.push(sample)
  }

  return samples
}

export interface UpdateSampleStatusOptions {
  recoleccion_en?: string
}

export function updateSampleStatus(
  db: Database.Database,
  id: number,
  estatus: SampleStatus,
  options: UpdateSampleStatusOptions = {},
): Sample {
  if (options.recoleccion_en !== undefined) {
    db.prepare('UPDATE muestras SET estatus = ?, recoleccion_en = ? WHERE id = ?').run(
      estatus,
      options.recoleccion_en,
      id,
    )
  } else {
    db.prepare('UPDATE muestras SET estatus = ? WHERE id = ?').run(estatus, id)
  }
  const sample = getSample(db, id)
  if (!sample) {
    throw new Error('Sample not found after status update')
  }
  return sample
}

/**
 * WU9 hook: mark the sample associated with an order_exam as Resultada.
 * This is the side-effect entry point called by the result validation flow.
 */
export function markSampleResultadaByOrderExam(db: Database.Database, ordenExamenId: number): Sample | null {
  const sample = getSampleByOrderExam(db, ordenExamenId)
  if (!sample) {
    return null
  }
  return updateSampleStatus(db, sample.id, 'Resultada')
}

export function rejectSample(db: Database.Database, id: number, motivo: string): Sample {
  db.prepare("UPDATE muestras SET estatus = 'Rechazada', motivo_rechazo = ? WHERE id = ?").run(motivo, id)
  const sample = getSample(db, id)
  if (!sample) {
    throw new Error('Sample not found after rejection')
  }
  return sample
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Generate a printable barcode label for a sample.
 * Returns an HTML string that can be loaded into a print window.
 * Catalog-provided values (sample type) are HTML-escaped before interpolation.
 */
export function generateSampleLabelHtml(sample: Sample): string {
  const codigo = escapeHtml(sample.codigo)
  const tipo = escapeHtml(sample.tipo_muestra)
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Etiqueta ${codigo}</title>
  <style>
    @page { size: 50mm 25mm; margin: 0; }
    body { margin: 0; padding: 3mm; font-family: monospace; font-size: 10pt; }
    .code { font-size: 12pt; font-weight: bold; margin-bottom: 1mm; }
    .barcode { height: 10mm; background: repeating-linear-gradient(90deg, #000 0, #000 1px, #fff 1px, #fff 3px); }
    .type { font-size: 8pt; color: #333; margin-top: 1mm; }
  </style>
</head>
<body>
  <div class="code">${codigo}</div>
  <div class="barcode" aria-hidden="true"></div>
  <div class="type">${tipo}</div>
</body>
</html>`
}
