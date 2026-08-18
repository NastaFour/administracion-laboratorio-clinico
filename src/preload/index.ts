import { contextBridge } from 'electron'
import type { LabCoreAPI } from '../shared/types'

const api: LabCoreAPI = {}

contextBridge.exposeInMainWorld('api', api)
