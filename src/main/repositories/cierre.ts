import type Database from 'better-sqlite3'
import { toIsoString } from './helpers'

export interface CierreRow {
  fecha: string
  total_bs: number
  total_usd: number
  tasa_bcv: number
  usuario_id: number
  detalle_por_metodo: Record<string, { bs: number; usd: number }>
}

export interface CierrePersisted {
  creado_en: string
}

/**
 * Upsert the daily cierre for a date. `fecha` is UNIQUE, so re-running the
 * cierre for the same day replaces the previous snapshot (idempotent close).
 */
export function upsertCierre(db: Database.Database, cierre: CierreRow): CierrePersisted {
  db.prepare(
    `INSERT INTO cierre_caja (fecha, total_bs, total_usd, tasa_bcv, usuario_id, detalle_por_metodo)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(fecha) DO UPDATE SET
       total_bs = excluded.total_bs,
       total_usd = excluded.total_usd,
       tasa_bcv = excluded.tasa_bcv,
       usuario_id = excluded.usuario_id,
       creado_en = CURRENT_TIMESTAMP,
       detalle_por_metodo = excluded.detalle_por_metodo`,
  ).run(
    cierre.fecha,
    cierre.total_bs,
    cierre.total_usd,
    cierre.tasa_bcv,
    cierre.usuario_id,
    JSON.stringify(cierre.detalle_por_metodo),
  )

  const row = db.prepare('SELECT creado_en FROM cierre_caja WHERE fecha = ?').get(cierre.fecha) as
    | { creado_en: string }
    | undefined
  return { creado_en: toIsoString(row?.creado_en) ?? new Date().toISOString() }
}

export function listCierres(
  db: Database.Database,
  filters: { desde?: string; hasta?: string } = {},
) {
  let query = `
    SELECT
      c.id,
      c.fecha,
      c.total_bs,
      c.total_usd,
      c.tasa_bcv,
      COALESCE(u.nombre_completo, u.username) AS cerrado_por,
      c.creado_en AS cerrado_en,
      c.detalle_por_metodo
    FROM cierre_caja c
    JOIN usuarios u ON u.id = c.usuario_id
    WHERE 1=1
  `
  const params: unknown[] = []

  if (filters.desde) {
    query += ' AND c.fecha >= ?'
    params.push(filters.desde)
  }
  if (filters.hasta) {
    query += ' AND c.fecha <= ?'
    params.push(filters.hasta)
  }

  query += ' ORDER BY c.fecha DESC, c.id DESC'

  interface DbCierreRow {
    id: number
    fecha: string
    total_bs: number
    total_usd: number
    tasa_bcv: number | null
    cerrado_por: string
    cerrado_en: string
    detalle_por_metodo: string | null
  }

  const rows = db.prepare(query).all(...params) as DbCierreRow[]

  return rows.map((row) => {
    let detalle: Record<string, { bs: number; usd: number }> = {}
    if (row.detalle_por_metodo) {
      try {
        detalle = JSON.parse(row.detalle_por_metodo)
      } catch {
        detalle = {}
      }
    }
    return {
      id: row.id,
      fecha: row.fecha,
      total_bs: row.total_bs,
      total_usd: row.total_usd,
      tasa_bcv: row.tasa_bcv,
      cerrado_por: row.cerrado_por,
      cerrado_en: toIsoString(row.cerrado_en) ?? new Date().toISOString(),
      detalle_por_metodo: detalle,
    }
  })
}
