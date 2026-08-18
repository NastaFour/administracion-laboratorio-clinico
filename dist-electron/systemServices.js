"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const electron = require("electron");
const path = require("path");
const fs = require("fs-extra");
const pdfTemplate = require("./pdfTemplate.js");
const database = require("./database.js");
const createPDFReport = async (data) => {
  console.log("Iniciando generación de PDF (Modo Editable) para:", data.patient.cedula);
  try {
    const configRows = database.default.prepare("SELECT clave, valor FROM configuracion").all();
    const config = {};
    configRows.forEach((row) => {
      config[row.clave] = row.valor;
    });
    const htmlContent = pdfTemplate.generateReportHTML({ ...data, config });
    let workerWindow = new electron.BrowserWindow({
      show: false,
      webPreferences: {
        offscreen: true,
        webSecurity: false
      }
    });
    await workerWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
    await workerWindow.webContents.executeJavaScript(`
            document.fonts.ready.then(() => {
                console.log("Fuentes listas");
            });
        `);
    await new Promise((resolve) => setTimeout(resolve, 500));
    const pdfOptions = {
      pageSize: "A4",
      printBackground: true,
      landscape: false,
      displayHeaderFooter: false,
      generateDocumentOutline: true,
      generateTaggedPDF: true
    };
    const pdfBuffer = await workerWindow.webContents.printToPDF(pdfOptions);
    const dateStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const fileName = `Reporte_${data.patient.cedula}_${dateStr}_${Date.now()}.pdf`;
    const exportPath = path.join(electron.app.getPath("documents"), "LabCore_Reportes");
    await fs.ensureDir(exportPath);
    const fullPath = path.join(exportPath, fileName);
    await fs.writeFile(fullPath, pdfBuffer);
    console.log("PDF Editorial guardado en:", fullPath);
    workerWindow.destroy();
    electron.shell.openPath(fullPath).catch((err) => console.error("Error al abrir PDF:", err));
    return fullPath;
  } catch (error) {
    console.error("Error crítico en createPDFReport:", error);
    throw error;
  }
};
const backupDatabase = async (dbPath) => {
  const backupDir = path.join(electron.app.getPath("userData"), "backups");
  await fs.ensureDir(backupDir);
  const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(backupDir, `lab_backup_${timestamp}.sqlite`);
  await fs.copyFile(dbPath, backupPath);
  return backupPath;
};
exports.backupDatabase = backupDatabase;
exports.createPDFReport = createPDFReport;
//# sourceMappingURL=systemServices.js.map
