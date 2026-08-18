"use strict";
const electron = require("electron");
const path = require("path");
const database = require("./database.js");
const ipcHandlers = require("./ipcHandlers.js");
let mainWindow = null;
function createWindow() {
  mainWindow = new electron.BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true
    },
    title: "LabCore v2.1",
    autoHideMenuBar: true
  });
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}
electron.app.whenReady().then(() => {
  database.initDB();
  ipcHandlers.setupIPCHandlers();
  createWindow();
  electron.app.on("activate", () => {
    if (electron.BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
//# sourceMappingURL=main.js.map
