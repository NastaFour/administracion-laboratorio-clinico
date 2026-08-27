import type Database from 'better-sqlite3'
import {
  configChannels,
  ROLES,
  type BioanalistaConfig,
  type BcvRateEntry,
  type LabConfig,
  type PrintConfig,
  type ReportFormat,
  type Session,
} from '@/shared/contracts'
import { handle } from './register'
import { writeAudit } from '../services/audit'
import {
  getBioanalistaConfig,
  getLabConfig,
  getPrintConfig,
  getReportFormat,
  listBcvHistory,
  setBioanalistaConfig,
  setLabConfig,
  setPrintConfig,
  setReportFormat,
} from '../repositories/config'

const ADMIN_ONLY = [ROLES.ADMIN]

export function handleGetLab(db: Database.Database): LabConfig {
  return getLabConfig(db)
}

export function handleSetLab(db: Database.Database, req: LabConfig, session: Session): LabConfig {
  const before = getLabConfig(db)
  const saved = setLabConfig(db, req)
  writeAudit(db, {
    usuario_id: session.userId,
    accion: 'config.cambiada',
    entidad: 'config',
    entidad_id: null,
    antes: before,
    despues: { seccion: 'lab', ...saved },
  })
  return saved
}

export function handleSetBioanalista(
  db: Database.Database,
  req: BioanalistaConfig,
  session: Session,
): BioanalistaConfig {
  const before = getBioanalistaConfig(db)
  const saved = setBioanalistaConfig(db, req)
  writeAudit(db, {
    usuario_id: session.userId,
    accion: 'config.cambiada',
    entidad: 'config',
    entidad_id: null,
    antes: before,
    despues: { seccion: 'bioanalista', ...saved },
  })
  return saved
}

export function handleGetBioanalista(db: Database.Database): BioanalistaConfig {
  return getBioanalistaConfig(db)
}

export function handleSetLogo(db: Database.Database, req: { logo: string }, session: Session): string {
  // The request schema only accepts base64 image data URIs (N11.3): a logo
  // stored as a filesystem path would break the PDF header on any other machine.
  const before = getLabConfig(db).logo
  setLabConfig(db, { ...getLabConfig(db), logo: req.logo })
  writeAudit(db, {
    usuario_id: session.userId,
    accion: 'config.cambiada',
    entidad: 'config',
    entidad_id: null,
    antes: { seccion: 'logo', longitud: before?.length ?? 0 },
    despues: { seccion: 'logo', longitud: req.logo.length },
  })
  return req.logo
}

export function handleGetPrint(db: Database.Database): PrintConfig {
  return getPrintConfig(db)
}

export function handleSetPrint(db: Database.Database, req: PrintConfig, session: Session): PrintConfig {
  const before = getPrintConfig(db)
  const saved = setPrintConfig(db, req)
  writeAudit(db, {
    usuario_id: session.userId,
    accion: 'config.cambiada',
    entidad: 'config',
    entidad_id: null,
    antes: before,
    despues: { seccion: 'print', ...saved },
  })
  return saved
}

export function handleGetBcvHistory(db: Database.Database): BcvRateEntry[] {
  return listBcvHistory(db)
}

export function handleGetReportFormat(db: Database.Database): ReportFormat {
  return getReportFormat(db)
}

export function handleSetReportFormat(
  db: Database.Database,
  req: { formato: ReportFormat },
  session: Session,
): ReportFormat {
  const before = getReportFormat(db)
  const saved = setReportFormat(db, req.formato)
  writeAudit(db, {
    usuario_id: session.userId,
    accion: 'config.cambiada',
    entidad: 'config',
    entidad_id: null,
    antes: { seccion: 'reporte_formato', formato: before },
    despues: { seccion: 'reporte_formato', formato: saved },
  })
  return saved
}

export function registerConfigHandlers(db: Database.Database): void {
  handle(db, 'config:getLab', ADMIN_ONLY, configChannels['config:getLab'].request, handleGetLab)
  handle(db, 'config:setLab', ADMIN_ONLY, configChannels['config:setLab'].request, handleSetLab)
  handle(db, 'config:setBioanalista', ADMIN_ONLY, configChannels['config:setBioanalista'].request, handleSetBioanalista)
  handle(db, 'config:getBioanalista', ADMIN_ONLY, configChannels['config:getBioanalista'].request, handleGetBioanalista)
  handle(db, 'config:setLogo', ADMIN_ONLY, configChannels['config:setLogo'].request, handleSetLogo)
  handle(db, 'config:getPrint', ADMIN_ONLY, configChannels['config:getPrint'].request, handleGetPrint)
  handle(db, 'config:setPrint', ADMIN_ONLY, configChannels['config:setPrint'].request, handleSetPrint)
  handle(db, 'config:getBcvHistory', ADMIN_ONLY, configChannels['config:getBcvHistory'].request, handleGetBcvHistory)
  // Reading the report format is allowed for every role: any staff member can
  // render/preview a report; only admins may change the default layout.
  handle(db, 'config:getReportFormat', [], configChannels['config:getReportFormat'].request, handleGetReportFormat)
  handle(db, 'config:setReportFormat', ADMIN_ONLY, configChannels['config:setReportFormat'].request, handleSetReportFormat)
}
