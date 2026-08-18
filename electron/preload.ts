// @ts-ignore
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    getPatients: () => ipcRenderer.invoke('db:getPatients'),
    savePatient: (patient: any) => ipcRenderer.invoke('db:savePatient', patient),
    deletePatient: (id: number) => ipcRenderer.invoke('db:deletePatient', id),
    deleteOrder: (id: number) => ipcRenderer.invoke('db:deleteOrder', id),
    saveResults: (data: any) => ipcRenderer.invoke('db:saveResults', data),
    updateOrderResults: (data: any) => ipcRenderer.invoke('db:updateOrderResults', data),
    getLabConfig: () => ipcRenderer.invoke('db:getLabConfig'),
    updateLabConfig: (config: any) => ipcRenderer.invoke('db:updateLabConfig', config),
    updatePaymentStatus: (data: { orderId: number, status: string }) => ipcRenderer.invoke('db:updatePaymentStatus', data),
    getHistory: () => ipcRenderer.invoke('db:getHistory'),
    getOrderReport: (orderId: number) => ipcRenderer.invoke('db:getOrderReport', orderId),
    getExams: () => ipcRenderer.invoke('db:getExams'),
    getParams: (query: any) => ipcRenderer.invoke('db:getParams', query),
    updateExam: (data: any) => ipcRenderer.invoke('db:updateExam', data),
    addExam: (data: any) => ipcRenderer.invoke('db:addExam', data),
    deleteExam: (id: number) => ipcRenderer.invoke('db:deleteExam', id),
    addParam: (data: any) => ipcRenderer.invoke('db:addParam', data),
    deleteParam: (id: number) => ipcRenderer.invoke('db:deleteParam', id),
    generatePDF: (data: any) => ipcRenderer.invoke('system:generatePDF', data),
    importData: (patients: any[]) => ipcRenderer.invoke('system:importData', patients),
    runBackup: () => ipcRenderer.invoke('system:backup'),
    exportFullBackup: () => ipcRenderer.invoke('system:exportFull'),
    importFullBackup: (params: { mode: 'replace' | 'merge' | 'preview' }) => ipcRenderer.invoke('system:importFull', params),
    seedCatalog: () => ipcRenderer.invoke('system:seedCatalog'),
    wipeData: () => ipcRenderer.invoke('system:wipeData'),
    quitApp: () => ipcRenderer.invoke('system:quit')
});
