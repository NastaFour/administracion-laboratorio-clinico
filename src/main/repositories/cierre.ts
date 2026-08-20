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
