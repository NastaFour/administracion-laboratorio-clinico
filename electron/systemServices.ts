import { app, BrowserWindow, shell } from 'electron';
import path from 'path';
import fs from 'fs-extra';
import { generateReportHTML } from './pdfTemplate';
import db from './database';

const createPDFReport = async (data: any) => {
    console.log("Iniciando generación de PDF (Modo Editable) para:", data.patient.cedula);

    try {
        const configRows = db.prepare('SELECT clave, valor FROM configuracion').all() as Array<{ clave: string; valor: string }>;
        const config: Record<string, string> = {};
        configRows.forEach(row => {
            config[row.clave] = row.valor;
        });

        const htmlContent = generateReportHTML({ ...data, config });
        let workerWindow = new BrowserWindow({
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

        await new Promise(resolve => setTimeout(resolve, 500));

        const pdfOptions = {
            pageSize: 'A4' as const,
            printBackground: true,
            landscape: false,
            displayHeaderFooter: false,
            generateDocumentOutline: true,
            generateTaggedPDF: true
        };

        const pdfBuffer = await workerWindow.webContents.printToPDF(pdfOptions);

        const dateStr = new Date().toISOString().split('T')[0];
        const fileName = `Reporte_${data.patient.cedula}_${dateStr}_${Date.now()}.pdf`;
        const exportPath = path.join(app.getPath('documents'), 'LabCore_Reportes');

        await fs.ensureDir(exportPath);
        const fullPath = path.join(exportPath, fileName);

        await fs.writeFile(fullPath, pdfBuffer);
        console.log("PDF Editorial guardado en:", fullPath);

        workerWindow.destroy();

        shell.openPath(fullPath).catch(err => console.error("Error al abrir PDF:", err));

        return fullPath;
    } catch (error) {
        console.error("Error crítico en createPDFReport:", error);
        throw error;
    }
};

const backupDatabase = async (dbPath: string) => {
    const backupDir = path.join(app.getPath('userData'), 'backups');
    await fs.ensureDir(backupDir);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `lab_backup_${timestamp}.sqlite`);

    await fs.copyFile(dbPath, backupPath);
    return backupPath;
};

export { createPDFReport, backupDatabase };
