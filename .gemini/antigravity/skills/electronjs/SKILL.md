---
name: electronjs
description: Desktop application development with Electron.js. Covers main/renderer process separation, secure IPC communication channels, contextIsolation, and window bounds management. Use when building desktop wrappers, cash register interfaces, or regional manager software.
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires Node 20+ and pnpm 9+."
allowed-tools: Bash(node:*) Read
metadata:
  trigger: ["electron", "desktop", "contextBridge", "IPC", "cash register"]
  scope: [global, project]
  version: "1.0.0"
---

# 💻 Electron.js Desktop Development (Secure Shells)

Use this skill when developing desktop wrappers, cash register interfaces, or regional manager software for the [APP] system.

## 🚨 Security & IPC Hardening (2026 Guardrails)

1. **Context Isolation**:
   - Always run the Renderer process with `contextIsolation: true` and `nodeIntegration: false` in the BrowserWindow configuration:
     ```javascript
     const mainWindow = new BrowserWindow({
       webPreferences: {
         preload: path.join(__dirname, 'preload.js'),
         contextIsolation: true,
         nodeIntegration: false,
       }
     });
     ```

2. **Secure Preload Scripts**:
   - Expose specific APIs to the frontend via `contextBridge`. NEVER expose raw `ipcRenderer` directly.
   - White-list valid IPC channels to prevent remote code execution:
     ```javascript
     // preload.js
     contextBridge.exposeInMainWorld('electronAPI', {
       sendOrderUpdate: (orderId, status) => {
         const validChannels = ['order:update-status'];
         if (validChannels.includes('order:update-status')) {
           ipcRenderer.send('order:update-status', { orderId, status });
         }
       }
     });
     ```

3. **Remote Navigation Control**:
   - Block unexpected navigations to unauthorized URLs. Enforce CSP headers in the renderer window context.

## 🛒 [APP] Desktop Shell (Regional Managers / Cash Registers)

- **Offline Cash Register Mode**: If the local cash register loses internet access, write checkout transactions to a local SQLite database file (`better-sqlite3` in the main process).
- **Auto-Sync daemon**: In the background (Electron main process), run a daemon that polls the local DB and uploads transactions to the main Postgres server as soon as connection is restored.
- **Hardware Integration**: Use Node native packages inside the main process to connect to local USB barcode scanners and receipt printers, exposing triggers to the renderer via context bridge.
