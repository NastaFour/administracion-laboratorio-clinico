---
name: electron
description: >
  Electron desktop application patterns: main/renderer process architecture, IPC communication,
  security hardening (contextIsolation, sandbox), native menus, auto-update, and packaging.
  Trigger when building or reviewing an Electron app, or when the user asks about desktop apps
  with web technologies, main/renderer communication, or Electron security.
  NOTE: skillsGV also has `electronjs` — this skill extends it with Gentleman Programming patterns.
license: MIT
compatibility: "Works with Claude Code, Cursor, Gemini, and any other agentskills.io compatible agent. Requires Node 18+."
allowed-tools: Read
metadata:
  author: gentleman-programming
  version: "1.0"
  category: 05-frontend
  tags: [electron, desktop, ipc, contextbridge, security, autoUpdate, packaging]
---

# Electron — Desktop App Patterns & Best Practices

## Process Architecture

```
┌─────────────────────────────────────────┐
│              Main Process               │
│  (Node.js — full system access)         │
│  • BrowserWindow management             │
│  • File system, native APIs             │
│  • ipcMain handlers                     │
└────────────────┬────────────────────────┘
                 │ IPC (structured clone)
┌────────────────▼────────────────────────┐
│            Preload Script               │
│  (contextBridge — controlled bridge)    │
│  • Exposes ONLY what renderer needs     │
│  • contextIsolation: true               │
└────────────────┬────────────────────────┘
                 │ window.api.*
┌────────────────▼────────────────────────┐
│           Renderer Process              │
│  (Browser — NO Node.js access)          │
│  • React / Vue / vanilla HTML           │
│  • nodeIntegration: false               │
└─────────────────────────────────────────┘
```

---

## Secure Main Process Setup

```javascript
// main.js
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,   // ✅ REQUIRED — isolates renderer from Node
      nodeIntegration: false,   // ✅ REQUIRED — no Node in renderer
      sandbox: true,            // ✅ RECOMMENDED — extra security layer
    },
  });

  // Load app
  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
```

---

## Secure IPC via contextBridge

```javascript
// preload.js — ONLY expose what the renderer legitimately needs
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Files
  readFile: (filePath) => ipcRenderer.invoke('file:read', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('file:write', filePath, content),
  openFile: () => ipcRenderer.invoke('dialog:openFile'),

  // App info
  getVersion: () => ipcRenderer.invoke('app:getVersion'),

  // Events from main → renderer
  onUpdate: (callback) => {
    ipcRenderer.on('update:available', (_, info) => callback(info));
  },
  offUpdate: () => ipcRenderer.removeAllListeners('update:available'),
});
```

```javascript
// main.js — ipcMain handlers
const { ipcMain, dialog, app } = require('electron');
const fs = require('fs/promises');

ipcMain.handle('file:read', async (event, filePath) => {
  // ✅ Always validate input — renderer could be compromised
  if (!filePath || typeof filePath !== 'string') throw new Error('Invalid path');
  return fs.readFile(filePath, 'utf-8');
});

ipcMain.handle('dialog:openFile', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  return canceled ? null : filePaths[0];
});

ipcMain.handle('app:getVersion', () => app.getVersion());
```

```javascript
// renderer — using the exposed API
async function loadConfig() {
  const filePath = await window.api.openFile();
  if (!filePath) return;
  const content = await window.api.readFile(filePath);
  return JSON.parse(content);
}
```

---

## Native Menu

```javascript
// main.js
const { Menu } = require('electron');

const template = [
  {
    label: 'File',
    submenu: [
      { label: 'Open...', accelerator: 'CmdOrCtrl+O', click: () => openFile() },
      { label: 'Save', accelerator: 'CmdOrCtrl+S', click: () => saveFile() },
      { type: 'separator' },
      { role: 'quit' },
    ],
  },
  {
    label: 'Edit',
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
    ],
  },
  {
    label: 'View',
    submenu: [
      { role: 'reload' },
      { role: 'toggleDevTools' },
      { type: 'separator' },
      { role: 'togglefullscreen' },
    ],
  },
];

Menu.setApplicationMenu(Menu.buildFromTemplate(template));
```

---

## Auto-Updater (electron-updater)

```javascript
// main.js
const { autoUpdater } = require('electron-updater');

autoUpdater.checkForUpdatesAndNotify();

autoUpdater.on('update-available', (info) => {
  mainWindow.webContents.send('update:available', info);
});

autoUpdater.on('update-downloaded', () => {
  mainWindow.webContents.send('update:downloaded');
});

// In preload:
// contextBridge exposes: onUpdateDownloaded(() => ipcRenderer.invoke('update:install'))

ipcMain.handle('update:install', () => {
  autoUpdater.quitAndInstall();
});
```

---

## Packaging (electron-builder)

```json
// package.json
{
  "build": {
    "appId": "com.acme.myapp",
    "productName": "My App",
    "directories": { "output": "release" },
    "files": ["dist/**", "main.js", "preload.js"],
    "mac": { "target": ["dmg", "zip"] },
    "win": { "target": ["nsis"] },
    "linux": { "target": ["AppImage", "deb"] },
    "publish": {
      "provider": "github",
      "owner": "acme",
      "repo": "my-app"
    }
  },
  "scripts": {
    "dev": "electron .",
    "build": "vite build && electron-builder",
    "release": "vite build && electron-builder --publish always"
  }
}
```

---

## Security Anti-Patterns

```javascript
// ❌ NEVER: nodeIntegration: true
webPreferences: {
  nodeIntegration: true,  // Renderer has full Node.js — XSS = RCE
}

// ❌ NEVER: contextIsolation: false
webPreferences: {
  contextIsolation: false,  // Renderer can access Electron internals
}

// ❌ NEVER: trust renderer input without validation
ipcMain.handle('file:delete', (event, path) => {
  fs.rmSync(path, { recursive: true });  // Renderer controls path — dangerous!
});

// ✅ DO: allowlist-based validation
const ALLOWED_DIRS = [app.getPath('userData'), app.getPath('documents')];
ipcMain.handle('file:delete', (event, filePath) => {
  const isAllowed = ALLOWED_DIRS.some(dir => filePath.startsWith(dir));
  if (!isAllowed) throw new Error('Path not allowed');
  return fs.rm(filePath);
});
```

---

## Integration con skillsGV

Combinar con: `electronjs` (skill base de skillsGV), `react-vite` (renderer con React), `typescript` (tipado del bridge), `solid-clean-code` (arquitectura main/renderer separada).

> **Nota:** skillsGV tiene `electronjs` en `05-frontend/electronjs`. Esta skill aporta los patrones de seguridad (contextBridge, sandbox, IPC validation) de Gentleman Programming que complementan la skill base.
