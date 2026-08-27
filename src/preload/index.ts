import { contextBridge, ipcRenderer } from 'electron'
import type { LabCoreAPI } from '../shared/types'
import { CHANNEL_ALLOWLIST, type ChannelName } from '../shared/contracts/channels'
import { authChannels } from '../shared/contracts/auth'
import { patientsChannels } from '../shared/contracts/patients'
import { catalogChannels } from '../shared/contracts/catalog'
import { medicosChannels } from '../shared/contracts/medicos'
import { ordersChannels } from '../shared/contracts/orders'
import { samplesChannels } from '../shared/contracts/samples'
import { resultsChannels } from '../shared/contracts/results'
import { reportsChannels } from '../shared/contracts/reports'
import { paymentsChannels } from '../shared/contracts/payments'
import { configChannels } from '../shared/contracts/config'
import { backupChannels } from '../shared/contracts/backup'
import { auditChannels } from '../shared/contracts/audit'
import { dashboardChannels } from '../shared/contracts/dashboard'
import type { z } from 'zod'

type ChannelDefinition = { request: z.ZodType<unknown>; response: z.ZodType<unknown> }
type ChannelMap = Record<string, ChannelDefinition>

function assertAllowed(channel: string): asserts channel is ChannelName {
  if (!CHANNEL_ALLOWLIST.includes(channel as ChannelName)) {
    throw new Error(`IPC channel ${channel} is not in the allowlist`)
  }
}

async function invoke<TRequest, TResponse>(
  channel: ChannelName,
  requestSchema: z.ZodType<TRequest>,
  responseSchema: z.ZodType<TResponse>,
  input: TRequest,
): Promise<TResponse> {
  const parsed = requestSchema.safeParse(input)
  if (!parsed.success) {
    throw new Error(`Invalid request for ${channel}: ${parsed.error.message}`)
  }

  const raw = await ipcRenderer.invoke(channel, parsed.data)
  const result = responseSchema.safeParse(raw)
  if (!result.success) {
    throw new Error(`Invalid response from ${channel}: ${result.error.message}`)
  }

  return result.data as TResponse
}

function makeDomain<D extends ChannelMap>(channels: D) {
  const domain = {} as Record<
    string,
    (input: unknown) => Promise<unknown>
  >

  for (const [channel, def] of Object.entries(channels)) {
    assertAllowed(channel)
    domain[channel.split(':')[1]] = (input: unknown) =>
      invoke(channel, def.request, def.response, input)
  }

  return domain
}

const api: LabCoreAPI = {
  onSessionExpired: (callback) => {
    const listener = () => callback()
    ipcRenderer.on('session:expired', listener)
    return () => {
      ipcRenderer.removeListener('session:expired', listener)
    }
  },
  auth: makeDomain(authChannels) as LabCoreAPI['auth'],
  users: makeDomain({
    'users:list': authChannels['users:list'],
    'users:create': authChannels['users:create'],
    'users:update': authChannels['users:update'],
    'users:disable': authChannels['users:disable'],
    'users:resetPassword': authChannels['users:resetPassword'],
  }) as LabCoreAPI['users'],
  patients: makeDomain(patientsChannels) as LabCoreAPI['patients'],
  catalog: makeDomain(catalogChannels) as LabCoreAPI['catalog'],
  medicos: makeDomain(medicosChannels) as LabCoreAPI['medicos'],
  orders: makeDomain(ordersChannels) as LabCoreAPI['orders'],
  samples: makeDomain(samplesChannels) as LabCoreAPI['samples'],
  results: makeDomain(resultsChannels) as LabCoreAPI['results'],
  reports: makeDomain(reportsChannels) as LabCoreAPI['reports'],
  payments: makeDomain({
    'payments:record': paymentsChannels['payments:record'],
    'payments:cancel': paymentsChannels['payments:cancel'],
    'payments:listForOrder': paymentsChannels['payments:listForOrder'],
    'payments:balance': paymentsChannels['payments:balance'],
    'payments:listAll': paymentsChannels['payments:listAll'],
  }) as LabCoreAPI['payments'],
  cierre: makeDomain({
    'cierre:run': paymentsChannels['cierre:run'],
    'cierre:print': paymentsChannels['cierre:print'],
  }) as LabCoreAPI['cierre'],
  config: makeDomain({
    ...configChannels,
    'config:getBcvRate': paymentsChannels['config:getBcvRate'],
    'config:setBcvRate': paymentsChannels['config:setBcvRate'],
  }) as LabCoreAPI['config'],
  backup: makeDomain(backupChannels) as LabCoreAPI['backup'],
  import: makeDomain({
    'import:preview': backupChannels['import:preview'],
    'import:apply': backupChannels['import:apply'],
  }) as LabCoreAPI['import'],
  export: makeDomain({
    'export:filtered': backupChannels['export:filtered'],
  }) as LabCoreAPI['export'],
  audit: makeDomain(auditChannels) as LabCoreAPI['audit'],
  dashboard: makeDomain(dashboardChannels) as LabCoreAPI['dashboard'],
}

contextBridge.exposeInMainWorld('api', api)
