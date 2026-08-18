import type { IpcChannels } from './contracts/channels'

/**
 * Renderer-facing API exposed through the Electron preload script.
 * Each domain exposes typed invoke helpers; main-process handlers enforce
 * role guards and authoritative validation.
 */
export interface LabCoreAPI {
  auth: {
    login: (req: IpcChannels['auth:login']['request']) => Promise<IpcChannels['auth:login']['response']>
    logout: () => Promise<IpcChannels['auth:logout']['response']>
    me: () => Promise<IpcChannels['auth:me']['response']>
    changePassword: (req: IpcChannels['auth:changePassword']['request']) => Promise<IpcChannels['auth:changePassword']['response']>
  }
  users: {
    list: () => Promise<IpcChannels['users:list']['response']>
    create: (req: IpcChannels['users:create']['request']) => Promise<IpcChannels['users:create']['response']>
    update: (req: IpcChannels['users:update']['request']) => Promise<IpcChannels['users:update']['response']>
    disable: (req: IpcChannels['users:disable']['request']) => Promise<IpcChannels['users:disable']['response']>
    resetPassword: (req: IpcChannels['users:resetPassword']['request']) => Promise<IpcChannels['users:resetPassword']['response']>
  }
  patients: {
    list: (req: IpcChannels['patients:list']['request']) => Promise<IpcChannels['patients:list']['response']>
    search: (req: IpcChannels['patients:search']['request']) => Promise<IpcChannels['patients:search']['response']>
    get: (req: IpcChannels['patients:get']['request']) => Promise<IpcChannels['patients:get']['response']>
    create: (req: IpcChannels['patients:create']['request']) => Promise<IpcChannels['patients:create']['response']>
    update: (req: IpcChannels['patients:update']['request']) => Promise<IpcChannels['patients:update']['response']>
    deactivate: (req: IpcChannels['patients:deactivate']['request']) => Promise<IpcChannels['patients:deactivate']['response']>
    merge: (req: IpcChannels['patients:merge']['request']) => Promise<IpcChannels['patients:merge']['response']>
    history: (req: IpcChannels['patients:history']['request']) => Promise<IpcChannels['patients:history']['response']>
  }
  catalog: {
    listExams: (req: IpcChannels['catalog:listExams']['request']) => Promise<IpcChannels['catalog:listExams']['response']>
    saveExam: (req: IpcChannels['catalog:saveExam']['request']) => Promise<IpcChannels['catalog:saveExam']['response']>
    deactivateExam: (req: IpcChannels['catalog:deactivateExam']['request']) => Promise<IpcChannels['catalog:deactivateExam']['response']>
    listParams: (req: IpcChannels['catalog:listParams']['request']) => Promise<IpcChannels['catalog:listParams']['response']>
    saveParam: (req: IpcChannels['catalog:saveParam']['request']) => Promise<IpcChannels['catalog:saveParam']['response']>
    saveRange: (req: IpcChannels['catalog:saveRange']['request']) => Promise<IpcChannels['catalog:saveRange']['response']>
    deactivateParam: (req: IpcChannels['catalog:deactivateParam']['request']) => Promise<IpcChannels['catalog:deactivateParam']['response']>
    import: (req: IpcChannels['catalog:import']['request']) => Promise<IpcChannels['catalog:import']['response']>
    export: () => Promise<IpcChannels['catalog:export']['response']>
  }
  medicos: {
    list: (req: IpcChannels['medicos:list']['request']) => Promise<IpcChannels['medicos:list']['response']>
    save: (req: IpcChannels['medicos:save']['request']) => Promise<IpcChannels['medicos:save']['response']>
    deactivate: (req: IpcChannels['medicos:deactivate']['request']) => Promise<IpcChannels['medicos:deactivate']['response']>
  }
  orders: {
    create: (req: IpcChannels['orders:create']['request']) => Promise<IpcChannels['orders:create']['response']>
    update: (req: IpcChannels['orders:update']['request']) => Promise<IpcChannels['orders:update']['response']>
    get: (req: IpcChannels['orders:get']['request']) => Promise<IpcChannels['orders:get']['response']>
    list: (req: IpcChannels['orders:list']['request']) => Promise<IpcChannels['orders:list']['response']>
    advanceStatus: (req: IpcChannels['orders:advanceStatus']['request']) => Promise<IpcChannels['orders:advanceStatus']['response']>
    deliver: (req: IpcChannels['orders:deliver']['request']) => Promise<IpcChannels['orders:deliver']['response']>
    void: (req: IpcChannels['orders:void']['request']) => Promise<IpcChannels['orders:void']['response']>
  }
  samples: {
    register: (req: IpcChannels['samples:register']['request']) => Promise<IpcChannels['samples:register']['response']>
    list: (req: IpcChannels['samples:list']['request']) => Promise<IpcChannels['samples:list']['response']>
    updateStatus: (req: IpcChannels['samples:updateStatus']['request']) => Promise<IpcChannels['samples:updateStatus']['response']>
    reject: (req: IpcChannels['samples:reject']['request']) => Promise<IpcChannels['samples:reject']['response']>
    label: (req: IpcChannels['samples:label']['request']) => Promise<IpcChannels['samples:label']['response']>
  }
  results: {
    paramsForCapture: (req: IpcChannels['results:paramsForCapture']['request']) => Promise<IpcChannels['results:paramsForCapture']['response']>
    capture: (req: IpcChannels['results:capture']['request']) => Promise<IpcChannels['results:capture']['response']>
    validate: (req: IpcChannels['results:validate']['request']) => Promise<IpcChannels['results:validate']['response']>
    reject: (req: IpcChannels['results:reject']['request']) => Promise<IpcChannels['results:reject']['response']>
    reopen: (req: IpcChannels['results:reopen']['request']) => Promise<IpcChannels['results:reopen']['response']>
    comment: (req: IpcChannels['results:comment']['request']) => Promise<IpcChannels['results:comment']['response']>
  }
  reports: {
    preview: (req: IpcChannels['reports:preview']['request']) => Promise<IpcChannels['reports:preview']['response']>
    print: (req: IpcChannels['reports:print']['request']) => Promise<IpcChannels['reports:print']['response']>
    savePdf: (req: IpcChannels['reports:savePdf']['request']) => Promise<IpcChannels['reports:savePdf']['response']>
  }
  payments: {
    record: (req: IpcChannels['payments:record']['request']) => Promise<IpcChannels['payments:record']['response']>
    cancel: (req: IpcChannels['payments:cancel']['request']) => Promise<IpcChannels['payments:cancel']['response']>
    listForOrder: (req: IpcChannels['payments:listForOrder']['request']) => Promise<IpcChannels['payments:listForOrder']['response']>
    balance: (req: IpcChannels['payments:balance']['request']) => Promise<IpcChannels['payments:balance']['response']>
  }
  cierre: {
    run: (req: IpcChannels['cierre:run']['request']) => Promise<IpcChannels['cierre:run']['response']>
    print: (req: IpcChannels['cierre:print']['request']) => Promise<IpcChannels['cierre:print']['response']>
  }
  config: {
    getBcvRate: () => Promise<IpcChannels['config:getBcvRate']['response']>
    setBcvRate: (req: IpcChannels['config:setBcvRate']['request']) => Promise<IpcChannels['config:setBcvRate']['response']>
    getLab: () => Promise<IpcChannels['config:getLab']['response']>
    setLab: (req: IpcChannels['config:setLab']['request']) => Promise<IpcChannels['config:setLab']['response']>
    setBioanalista: (req: IpcChannels['config:setBioanalista']['request']) => Promise<IpcChannels['config:setBioanalista']['response']>
    setLogo: (req: IpcChannels['config:setLogo']['request']) => Promise<IpcChannels['config:setLogo']['response']>
    getPrint: () => Promise<IpcChannels['config:getPrint']['response']>
    setPrint: (req: IpcChannels['config:setPrint']['request']) => Promise<IpcChannels['config:setPrint']['response']>
  }
  backup: {
    create: (req: IpcChannels['backup:create']['request']) => Promise<IpcChannels['backup:create']['response']>
    list: () => Promise<IpcChannels['backup:list']['response']>
    restore: (req: IpcChannels['backup:restore']['request']) => Promise<IpcChannels['backup:restore']['response']>
    prune: (req: IpcChannels['backup:prune']['request']) => Promise<IpcChannels['backup:prune']['response']>
  }
  import: {
    preview: (req: IpcChannels['import:preview']['request']) => Promise<IpcChannels['import:preview']['response']>
    apply: (req: IpcChannels['import:apply']['request']) => Promise<IpcChannels['import:apply']['response']>
  }
  export: {
    filtered: (req: IpcChannels['export:filtered']['request']) => Promise<IpcChannels['export:filtered']['response']>
  }
  audit: {
    list: (req: IpcChannels['audit:list']['request']) => Promise<IpcChannels['audit:list']['response']>
  }
  dashboard: {
    today: (req: IpcChannels['dashboard:today']['request']) => Promise<IpcChannels['dashboard:today']['response']>
    debtors: (req: IpcChannels['dashboard:debtors']['request']) => Promise<IpcChannels['dashboard:debtors']['response']>
    stats: (req: IpcChannels['dashboard:stats']['request']) => Promise<IpcChannels['dashboard:stats']['response']>
    trends: (req: IpcChannels['dashboard:trends']['request']) => Promise<IpcChannels['dashboard:trends']['response']>
  }
}

declare global {
  interface Window {
    api: LabCoreAPI
  }
}

export type { IpcChannels }
