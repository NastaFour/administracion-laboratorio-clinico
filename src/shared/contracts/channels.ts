import type { AuthChannels } from './auth'
import type { PatientsChannels } from './patients'
import type { CatalogChannels } from './catalog'
import type { MedicosChannels } from './medicos'
import type { OrdersChannels } from './orders'
import type { SamplesChannels } from './samples'
import type { ResultsChannels } from './results'
import type { ReportsChannels } from './reports'
import type { PaymentsChannels } from './payments'
import type { ConfigChannels } from './config'
import type { BackupChannels } from './backup'
import type { AuditChannels } from './audit'
import type { DashboardChannels } from './dashboard'

/**
 * Complete typed channel inventory exposed by the preload API.
 * Each entry declares the Zod-validated request payload and the envelope-wrapped response.
 */
export interface IpcChannels
  extends AuthChannels,
      PatientsChannels,
      CatalogChannels,
      MedicosChannels,
      OrdersChannels,
      SamplesChannels,
      ResultsChannels,
      ReportsChannels,
      PaymentsChannels,
      ConfigChannels,
      BackupChannels,
      AuditChannels,
      DashboardChannels {}

/**
 * Runtime allowlist used by the preload script to reject unknown channels.
 */
export const CHANNEL_ALLOWLIST = Object.freeze([
  // auth
  'auth:login',
  'auth:logout',
  'auth:me',
  'auth:changePassword',
  'users:list',
  'users:create',
  'users:update',
  'users:disable',
  'users:resetPassword',

  // patients
  'patients:list',
  'patients:search',
  'patients:get',
  'patients:create',
  'patients:update',
  'patients:deactivate',
  'patients:merge',
  'patients:history',

  // catalog
  'catalog:listExams',
  'catalog:saveExam',
  'catalog:deactivateExam',
  'catalog:listParams',
  'catalog:saveParam',
  'catalog:listRanges',
  'catalog:saveRange',
  'catalog:deactivateRange',
  'catalog:deactivateParam',
  'catalog:import',
  'catalog:export',

  // medicos
  'medicos:list',
  'medicos:save',
  'medicos:deactivate',

  // orders
  'orders:create',
  'orders:update',
  'orders:get',
  'orders:list',
  'orders:advanceStatus',
  'orders:deliver',
  'orders:void',
  'orders:authorizeCredit',

  // samples
  'samples:register',
  'samples:list',
  'samples:updateStatus',
  'samples:reject',
  'samples:label',

  // results
  'results:paramsForCapture',
  'results:capture',
  'results:validate',
  'results:reject',
  'results:reopen',
  'results:comment',

  // reports
  'reports:preview',
  'reports:print',
  'reports:savePdf',

  // payments + cierre + bcv
  'payments:record',
  'payments:cancel',
  'payments:listForOrder',
  'payments:balance',
  'payments:listAll',
  'cierre:run',
  'cierre:print',
  'config:getBcvRate',
  'config:setBcvRate',

  // config
  'config:getLab',
  'config:setLab',
  'config:setBioanalista',
  'config:getBioanalista',
  'config:setLogo',
  'config:getPrint',
  'config:setPrint',
  'config:getBcvHistory',

  // backup / import / export
  'backup:create',
  'backup:list',
  'backup:restore',
  'backup:prune',
  'import:preview',
  'import:apply',
  'export:filtered',

  // audit
  'audit:list',

  // dashboard
  'dashboard:today',
  'dashboard:debtors',
  'dashboard:stats',
  'dashboard:trends',
  'dashboard:patientAnalytes',
] as const)

export type ChannelName = (typeof CHANNEL_ALLOWLIST)[number]
