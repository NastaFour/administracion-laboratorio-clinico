import { BrowserWindow } from 'electron'
import path from 'node:path'

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL)

export function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    title: 'LabCore',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  // Never allow the renderer to open arbitrary windows (sandbox posture).
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    window.loadURL(process.env.VITE_DEV_SERVER_URL)
    window.webContents.openDevTools()
  } else {
    window.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  return window
}
