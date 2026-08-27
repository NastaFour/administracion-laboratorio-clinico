import type { IpcChannels } from './contracts/channels'
import type { z } from 'zod'

/**
 * Infer the runtime data type from a channel's request/response schema.
 */
type RequestOf<C extends { request: z.ZodType<unknown> }> = z.infer<C['request']>
type ResponseOf<C extends { response: z.ZodType<unknown> }> = z.infer<C['response']>

/**
 * Renderer-facing API exposed through the Electron preload script.
 * Each domain exposes typed invoke helpers; main-process handlers enforce
 * role guards and authoritative validation.
 */
export interface LabCoreAPI {
  /** Subscribe to main-side idle-watchdog expiry (design A4). Returns an unsubscribe fn. */
  onSessionExpired: (callback: () => void) => () => void
  auth: {
    login: (req: RequestOf<IpcChannels['auth:login']>) => Promise<ResponseOf<IpcChannels['auth:login']>>
    logout: () => Promise<ResponseOf<IpcChannels['auth:logout']>>
    me: () => Promise<ResponseOf<IpcChannels['auth:me']>>
    changePassword: (req: RequestOf<IpcChannels['auth:changePassword']>) => Promise<ResponseOf<IpcChannels['auth:changePassword']>>
  }
  users: {
    list: () => Promise<ResponseOf<IpcChannels['users:list']>>
    create: (req: RequestOf<IpcChannels['users:create']>) => Promise<ResponseOf<IpcChannels['users:create']>>
    update: (req: RequestOf<IpcChannels['users:update']>) => Promise<ResponseOf<IpcChannels['users:update']>>
    disable: (req: RequestOf<IpcChannels['users:disable']>) => Promise<ResponseOf<IpcChannels['users:disable']>>
    resetPassword: (req: RequestOf<IpcChannels['users:resetPassword']>) => Promise<ResponseOf<IpcChannels['users:resetPassword']>>
  }
  patients: {
    list: (req: RequestOf<IpcChannels['patients:list']>) => Promise<ResponseOf<IpcChannels['patients:list']>>
    search: (req: RequestOf<IpcChannels['patients:search']>) => Promise<ResponseOf<IpcChannels['patients:search']>>
    get: (req: RequestOf<IpcChannels['patients:get']>) => Promise<ResponseOf<IpcChannels['patients:get']>>
    create: (req: RequestOf<IpcChannels['patients:create']>) => Promise<ResponseOf<IpcChannels['patients:create']>>
    update: (req: RequestOf<IpcChannels['patients:update']>) => Promise<ResponseOf<IpcChannels['patients:update']>>
    deactivate: (req: RequestOf<IpcChannels['patients:deactivate']>) => Promise<ResponseOf<IpcChannels['patients:deactivate']>>
    merge: (req: RequestOf<IpcChannels['patients:merge']>) => Promise<ResponseOf<IpcChannels['patients:merge']>>
    history: (req: RequestOf<IpcChannels['patients:history']>) => Promise<ResponseOf<IpcChannels['patients:history']>>
    dossier: (req: RequestOf<IpcChannels['patients:dossier']>) => Promise<ResponseOf<IpcChannels['patients:dossier']>>
  }
  catalog: {
    listExams: (req: RequestOf<IpcChannels['catalog:listExams']>) => Promise<ResponseOf<IpcChannels['catalog:listExams']>>
    saveExam: (req: RequestOf<IpcChannels['catalog:saveExam']>) => Promise<ResponseOf<IpcChannels['catalog:saveExam']>>
    deactivateExam: (req: RequestOf<IpcChannels['catalog:deactivateExam']>) => Promise<ResponseOf<IpcChannels['catalog:deactivateExam']>>
    listParams: (req: RequestOf<IpcChannels['catalog:listParams']>) => Promise<ResponseOf<IpcChannels['catalog:listParams']>>
    saveParam: (req: RequestOf<IpcChannels['catalog:saveParam']>) => Promise<ResponseOf<IpcChannels['catalog:saveParam']>>
    listRanges: (req: RequestOf<IpcChannels['catalog:listRanges']>) => Promise<ResponseOf<IpcChannels['catalog:listRanges']>>
    saveRange: (req: RequestOf<IpcChannels['catalog:saveRange']>) => Promise<ResponseOf<IpcChannels['catalog:saveRange']>>
    deactivateRange: (req: RequestOf<IpcChannels['catalog:deactivateRange']>) => Promise<ResponseOf<IpcChannels['catalog:deactivateRange']>>
    deactivateParam: (req: RequestOf<IpcChannels['catalog:deactivateParam']>) => Promise<ResponseOf<IpcChannels['catalog:deactivateParam']>>
    import: (req: RequestOf<IpcChannels['catalog:import']>) => Promise<ResponseOf<IpcChannels['catalog:import']>>
    export: () => Promise<ResponseOf<IpcChannels['catalog:export']>>
  }
  medicos: {
    list: (req: RequestOf<IpcChannels['medicos:list']>) => Promise<ResponseOf<IpcChannels['medicos:list']>>
    save: (req: RequestOf<IpcChannels['medicos:save']>) => Promise<ResponseOf<IpcChannels['medicos:save']>>
    deactivate: (req: RequestOf<IpcChannels['medicos:deactivate']>) => Promise<ResponseOf<IpcChannels['medicos:deactivate']>>
  }
  orders: {
    create: (req: RequestOf<IpcChannels['orders:create']>) => Promise<ResponseOf<IpcChannels['orders:create']>>
    update: (req: RequestOf<IpcChannels['orders:update']>) => Promise<ResponseOf<IpcChannels['orders:update']>>
    get: (req: RequestOf<IpcChannels['orders:get']>) => Promise<ResponseOf<IpcChannels['orders:get']>>
    list: (req: RequestOf<IpcChannels['orders:list']>) => Promise<ResponseOf<IpcChannels['orders:list']>>
    advanceStatus: (req: RequestOf<IpcChannels['orders:advanceStatus']>) => Promise<ResponseOf<IpcChannels['orders:advanceStatus']>>
    deliver: (req: RequestOf<IpcChannels['orders:deliver']>) => Promise<ResponseOf<IpcChannels['orders:deliver']>>
    void: (req: RequestOf<IpcChannels['orders:void']>) => Promise<ResponseOf<IpcChannels['orders:void']>>
    authorizeCredit: (req: RequestOf<IpcChannels['orders:authorizeCredit']>) => Promise<ResponseOf<IpcChannels['orders:authorizeCredit']>>
  }
  samples: {
    register: (req: RequestOf<IpcChannels['samples:register']>) => Promise<ResponseOf<IpcChannels['samples:register']>>
    list: (req: RequestOf<IpcChannels['samples:list']>) => Promise<ResponseOf<IpcChannels['samples:list']>>
    updateStatus: (req: RequestOf<IpcChannels['samples:updateStatus']>) => Promise<ResponseOf<IpcChannels['samples:updateStatus']>>
    reject: (req: RequestOf<IpcChannels['samples:reject']>) => Promise<ResponseOf<IpcChannels['samples:reject']>>
    label: (req: RequestOf<IpcChannels['samples:label']>) => Promise<ResponseOf<IpcChannels['samples:label']>>
  }
  results: {
    paramsForCapture: (req: RequestOf<IpcChannels['results:paramsForCapture']>) => Promise<ResponseOf<IpcChannels['results:paramsForCapture']>>
    capture: (req: RequestOf<IpcChannels['results:capture']>) => Promise<ResponseOf<IpcChannels['results:capture']>>
    validate: (req: RequestOf<IpcChannels['results:validate']>) => Promise<ResponseOf<IpcChannels['results:validate']>>
    reject: (req: RequestOf<IpcChannels['results:reject']>) => Promise<ResponseOf<IpcChannels['results:reject']>>
    reopen: (req: RequestOf<IpcChannels['results:reopen']>) => Promise<ResponseOf<IpcChannels['results:reopen']>>
    comment: (req: RequestOf<IpcChannels['results:comment']>) => Promise<ResponseOf<IpcChannels['results:comment']>>
  }
  reports: {
    preview: (req: RequestOf<IpcChannels['reports:preview']>) => Promise<ResponseOf<IpcChannels['reports:preview']>>
    print: (req: RequestOf<IpcChannels['reports:print']>) => Promise<ResponseOf<IpcChannels['reports:print']>>
    savePdf: (req: RequestOf<IpcChannels['reports:savePdf']>) => Promise<ResponseOf<IpcChannels['reports:savePdf']>>
  }
  payments: {
    record: (req: RequestOf<IpcChannels['payments:record']>) => Promise<ResponseOf<IpcChannels['payments:record']>>
    cancel: (req: RequestOf<IpcChannels['payments:cancel']>) => Promise<ResponseOf<IpcChannels['payments:cancel']>>
    listForOrder: (req: RequestOf<IpcChannels['payments:listForOrder']>) => Promise<ResponseOf<IpcChannels['payments:listForOrder']>>
    balance: (req: RequestOf<IpcChannels['payments:balance']>) => Promise<ResponseOf<IpcChannels['payments:balance']>>
    listAll: (req: RequestOf<IpcChannels['payments:listAll']>) => Promise<ResponseOf<IpcChannels['payments:listAll']>>
  }
  cierre: {
    run: (req: RequestOf<IpcChannels['cierre:run']>) => Promise<ResponseOf<IpcChannels['cierre:run']>>
    print: (req: RequestOf<IpcChannels['cierre:print']>) => Promise<ResponseOf<IpcChannels['cierre:print']>>
    list: (req: RequestOf<IpcChannels['cierre:list']>) => Promise<ResponseOf<IpcChannels['cierre:list']>>
    metrics: (req: RequestOf<IpcChannels['cierre:metrics']>) => Promise<ResponseOf<IpcChannels['cierre:metrics']>>
  }
  config: {
    getBcvRate: () => Promise<ResponseOf<IpcChannels['config:getBcvRate']>>
    setBcvRate: (req: RequestOf<IpcChannels['config:setBcvRate']>) => Promise<ResponseOf<IpcChannels['config:setBcvRate']>>
    getBcvHistory: () => Promise<ResponseOf<IpcChannels['config:getBcvHistory']>>
    getLab: () => Promise<ResponseOf<IpcChannels['config:getLab']>>
    setLab: (req: RequestOf<IpcChannels['config:setLab']>) => Promise<ResponseOf<IpcChannels['config:setLab']>>
    setBioanalista: (req: RequestOf<IpcChannels['config:setBioanalista']>) => Promise<ResponseOf<IpcChannels['config:setBioanalista']>>
    getBioanalista: () => Promise<ResponseOf<IpcChannels['config:getBioanalista']>>
    setLogo: (req: RequestOf<IpcChannels['config:setLogo']>) => Promise<ResponseOf<IpcChannels['config:setLogo']>>
    getPrint: () => Promise<ResponseOf<IpcChannels['config:getPrint']>>
    setPrint: (req: RequestOf<IpcChannels['config:setPrint']>) => Promise<ResponseOf<IpcChannels['config:setPrint']>>
    getReportFormat: () => Promise<ResponseOf<IpcChannels['config:getReportFormat']>>
    setReportFormat: (req: RequestOf<IpcChannels['config:setReportFormat']>) => Promise<ResponseOf<IpcChannels['config:setReportFormat']>>
  }
  backup: {
    create: (req: RequestOf<IpcChannels['backup:create']>) => Promise<ResponseOf<IpcChannels['backup:create']>>
    list: () => Promise<ResponseOf<IpcChannels['backup:list']>>
    restore: (req: RequestOf<IpcChannels['backup:restore']>) => Promise<ResponseOf<IpcChannels['backup:restore']>>
    prune: (req: RequestOf<IpcChannels['backup:prune']>) => Promise<ResponseOf<IpcChannels['backup:prune']>>
  }
  import: {
    preview: (req: RequestOf<IpcChannels['import:preview']>) => Promise<ResponseOf<IpcChannels['import:preview']>>
    apply: (req: RequestOf<IpcChannels['import:apply']>) => Promise<ResponseOf<IpcChannels['import:apply']>>
  }
  export: {
    filtered: (req: RequestOf<IpcChannels['export:filtered']>) => Promise<ResponseOf<IpcChannels['export:filtered']>>
  }
  audit: {
    list: (req: RequestOf<IpcChannels['audit:list']>) => Promise<ResponseOf<IpcChannels['audit:list']>>
  }
  dashboard: {
    today: (req: RequestOf<IpcChannels['dashboard:today']>) => Promise<ResponseOf<IpcChannels['dashboard:today']>>
    debtors: (req: RequestOf<IpcChannels['dashboard:debtors']>) => Promise<ResponseOf<IpcChannels['dashboard:debtors']>>
    stats: (req: RequestOf<IpcChannels['dashboard:stats']>) => Promise<ResponseOf<IpcChannels['dashboard:stats']>>
    trends: (req: RequestOf<IpcChannels['dashboard:trends']>) => Promise<ResponseOf<IpcChannels['dashboard:trends']>>
    patientAnalytes: (req: RequestOf<IpcChannels['dashboard:patientAnalytes']>) => Promise<ResponseOf<IpcChannels['dashboard:patientAnalytes']>>
  }
}

declare global {
  interface Window {
    api: LabCoreAPI
  }
}

export type { IpcChannels }
