import type Database from 'better-sqlite3'
import type { BioanalistaConfig, BcvRateEntry, LabConfig, PrintConfig, ReportFormat } from '@/shared/contracts'
import { toIsoString } from './helpers'

export function getConfigValue(db: Database.Database, clave: string): string | null {
  const row = db.prepare('SELECT valor FROM configuracion WHERE clave = ?').get(clave) as
    | { valor: string }
    | undefined
  return row?.valor ?? null
}

export function setConfigValue(db: Database.Database, clave: string, valor: string | null): void {
  if (valor === null) {
    db.prepare('DELETE FROM configuracion WHERE clave = ?').run(clave)
    return
  }
  db.prepare('INSERT INTO configuracion (clave, valor) VALUES (?, ?) ON CONFLICT(clave) DO UPDATE SET valor = ?').run(
    clave,
    valor,
    valor,
  )
}

const LAB_CONFIG_KEYS: Record<keyof LabConfig, string> = {
  nombre: 'lab_nombre',
  rif: 'lab_rif',
  direccion: 'lab_direccion',
  sede: 'lab_sede',
  telefono: 'lab_telefono',
  email: 'lab_email',
  logo: 'lab_logo',
}

export function getLabConfig(db: Database.Database): LabConfig {
  return {
    nombre: getConfigValue(db, LAB_CONFIG_KEYS.nombre) ?? '',
    rif: getConfigValue(db, LAB_CONFIG_KEYS.rif),
    direccion: getConfigValue(db, LAB_CONFIG_KEYS.direccion),
    sede: getConfigValue(db, LAB_CONFIG_KEYS.sede),
    telefono: getConfigValue(db, LAB_CONFIG_KEYS.telefono),
    email: getConfigValue(db, LAB_CONFIG_KEYS.email),
    logo: getConfigValue(db, LAB_CONFIG_KEYS.logo),
  }
}

export function setLabConfig(db: Database.Database, config: LabConfig): LabConfig {
  for (const [key, clave] of Object.entries(LAB_CONFIG_KEYS) as Array<[keyof LabConfig, string]>) {
    setConfigValue(db, clave, config[key])
  }
  return getLabConfig(db)
}

const BIOANALISTA_CONFIG_KEYS: Record<keyof BioanalistaConfig, string> = {
  nombre: 'prof_nombre',
  titulo: 'prof_titulo',
  registro_msds: 'prof_msds',
  registro_cbz: 'prof_cbz',
  firma: 'prof_firma',
}

export function getBioanalistaConfig(db: Database.Database): BioanalistaConfig {
  return {
    nombre: getConfigValue(db, BIOANALISTA_CONFIG_KEYS.nombre) ?? '',
    titulo: getConfigValue(db, BIOANALISTA_CONFIG_KEYS.titulo) ?? '',
    registro_msds: getConfigValue(db, BIOANALISTA_CONFIG_KEYS.registro_msds),
    registro_cbz: getConfigValue(db, BIOANALISTA_CONFIG_KEYS.registro_cbz),
    firma: getConfigValue(db, BIOANALISTA_CONFIG_KEYS.firma),
  }
}

export function setBioanalistaConfig(db: Database.Database, config: BioanalistaConfig): BioanalistaConfig {
  for (const [key, clave] of Object.entries(BIOANALISTA_CONFIG_KEYS) as Array<[keyof BioanalistaConfig, string]>) {
    setConfigValue(db, clave, config[key])
  }
  return getBioanalistaConfig(db)
}

const PRINT_CONFIG_KEYS: Record<keyof PrintConfig, string> = {
  pageSize: 'print_page_size',
  margins: 'print_margins',
  copies: 'print_copies',
}

const DEFAULT_PRINT_MARGINS: PrintConfig['margins'] = {
  top: '10mm',
  right: '10mm',
  bottom: '10mm',
  left: '10mm',
}

export function getPrintConfig(db: Database.Database): PrintConfig {
  const marginsJson = getConfigValue(db, PRINT_CONFIG_KEYS.margins)
  return {
    pageSize: (getConfigValue(db, PRINT_CONFIG_KEYS.pageSize) as PrintConfig['pageSize']) ?? 'A4',
    margins: marginsJson ? (JSON.parse(marginsJson) as PrintConfig['margins']) : DEFAULT_PRINT_MARGINS,
    copies: Number(getConfigValue(db, PRINT_CONFIG_KEYS.copies) ?? 1),
  }
}

export function setPrintConfig(db: Database.Database, config: PrintConfig): PrintConfig {
  setConfigValue(db, PRINT_CONFIG_KEYS.pageSize, config.pageSize)
  setConfigValue(db, PRINT_CONFIG_KEYS.margins, JSON.stringify(config.margins))
  setConfigValue(db, PRINT_CONFIG_KEYS.copies, String(config.copies))
  return getPrintConfig(db)
}

const REPORT_FORMAT_KEY = 'reporte_formato'

/**
 * Dual-format PDF system (SPEC-VISUAL-PDF-TEMPLATES §3.A): any value that is
 * not a known format falls back to 'generico' so a corrupted/legacy config
 * row never breaks report rendering.
 */
export function getReportFormat(db: Database.Database): ReportFormat {
  const value = getConfigValue(db, REPORT_FORMAT_KEY)
  return value === 'especializado' ? 'especializado' : 'generico'
}

export function setReportFormat(db: Database.Database, formato: ReportFormat): ReportFormat {
  setConfigValue(db, REPORT_FORMAT_KEY, formato)
  return getReportFormat(db)
}

export function getBcvRate(db: Database.Database): { tasa: number; actualizado_en: string } | null {
  const row = db
    .prepare('SELECT tasa_bcv, creado_en FROM bcv_historial ORDER BY id DESC LIMIT 1')
    .get() as { tasa_bcv: number; creado_en: string } | undefined
  if (!row) {
    return null
  }
  return {
    tasa: row.tasa_bcv,
    // bcv_historial.creado_en is a naive SQLite UTC timestamp — toIsoString
    // parses it as a UTC instant so the displayed last-updated time is not
    // shifted by the local timezone (W-JD1).
    actualizado_en: toIsoString(row.creado_en) ?? '',
  }
}

export function setBcvRate(db: Database.Database, tasa: number, usuarioId: number): { tasa: number; actualizado_en: string } {
  db.prepare('INSERT INTO bcv_historial (tasa_bcv, usuario_id) VALUES (?, ?)').run(tasa, usuarioId)
  return getBcvRate(db)!
}

export function listBcvHistory(db: Database.Database, limit = 100): BcvRateEntry[] {
  const rows = db
    .prepare('SELECT tasa_bcv, creado_en, usuario_id FROM bcv_historial ORDER BY id DESC LIMIT ?')
    .all(limit) as Array<{ tasa_bcv: number; creado_en: string; usuario_id: number | null }>
  return rows.map((row) => ({
    tasa: row.tasa_bcv,
    actualizado_en: toIsoString(row.creado_en) ?? '',
    usuario_id: row.usuario_id,
  }))
}
