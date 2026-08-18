"use strict";
const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("electronAPI", {
  getPatients: () => ipcRenderer.invoke("db:getPatients"),
  savePatient: (patient) => ipcRenderer.invoke("db:savePatient", patient),
  deletePatient: (id) => ipcRenderer.invoke("db:deletePatient", id),
  deleteOrder: (id) => ipcRenderer.invoke("db:deleteOrder", id),
  saveResults: (data) => ipcRenderer.invoke("db:saveResults", data),
  updateOrderResults: (data) => ipcRenderer.invoke("db:updateOrderResults", data),
  getLabConfig: () => ipcRenderer.invoke("db:getLabConfig"),
  updateLabConfig: (config) => ipcRenderer.invoke("db:updateLabConfig", config),
  updatePaymentStatus: (data) => ipcRenderer.invoke("db:updatePaymentStatus", data),
  getHistory: () => ipcRenderer.invoke("db:getHistory"),
  getOrderReport: (orderId) => ipcRenderer.invoke("db:getOrderReport", orderId),
  getExams: () => ipcRenderer.invoke("db:getExams"),
  getParams: (query) => ipcRenderer.invoke("db:getParams", query),
  updateExam: (data) => ipcRenderer.invoke("db:updateExam", data),
  addExam: (data) => ipcRenderer.invoke("db:addExam", data),
  deleteExam: (id) => ipcRenderer.invoke("db:deleteExam", id),
  addParam: (data) => ipcRenderer.invoke("db:addParam", data),
  deleteParam: (id) => ipcRenderer.invoke("db:deleteParam", id),
  generatePDF: (data) => ipcRenderer.invoke("system:generatePDF", data),
  importData: (patients) => ipcRenderer.invoke("system:importData", patients),
  runBackup: () => ipcRenderer.invoke("system:backup"),
  exportFullBackup: () => ipcRenderer.invoke("system:exportFull"),
  importFullBackup: (params) => ipcRenderer.invoke("system:importFull", params),
  seedCatalog: () => ipcRenderer.invoke("system:seedCatalog"),
  wipeData: () => ipcRenderer.invoke("system:wipeData"),
  quitApp: () => ipcRenderer.invoke("system:quit")
});
//# sourceMappingURL=preload.js.map
