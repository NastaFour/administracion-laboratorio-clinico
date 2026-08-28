import { app, BrowserWindow } from 'electron'
import path from 'node:path'
import { createMainWindow } from './window'
import { getDefaultDbPath, getDatabase, closeDatabase } from './services/db'
import { loadMigrationsFromDir, runMigrations } from './migrations/runner'
import { hashPassword } from './services/auth'
import { bootstrapAdminUser } from './repositories/users'
import { registerAuthHandlers } from './ipc/auth.ipc'
import { registerUsersHandlers } from './ipc/users.ipc'
import { registerPatientsHandlers } from './ipc/patients.ipc'
import { registerCatalogHandlers } from './ipc/catalog.ipc'
import { registerMedicosHandlers } from './ipc/medicos.ipc'
import { registerOrdersHandlers } from './ipc/orders.ipc'
import { registerSamplesHandlers } from './ipc/samples.ipc'
import { registerResultsHandlers } from './ipc/results.ipc'
import { registerPaymentsHandlers } from './ipc/payments.ipc'
import { registerDashboardHandlers } from './ipc/dashboard.ipc'
import { registerReportsHandlers } from './ipc/reports.ipc'
import { registerConfigHandlers } from './ipc/config.ipc'
import { registerBackupHandlers } from './ipc/backup.ipc'
import { registerAuditHandlers } from './ipc/audit.ipc'
import { configureGuardDependencies } from './ipc/register'
import { getSession, setIdleExpiryHandler, touchSession } from './services/auth'
import { writeAudit } from './services/audit'
import { ensureDefaultLogo, ensureDefaultSignature } from './services/logo'

async function prepareDatabase(): Promise<void> {
  const dbPath = getDefaultDbPath()
  const migrationsDir = app.isPackaged
    ? path.join(process.resourcesPath, 'migrations')
    : path.resolve('src/main/migrations')
  const backupsDir = app.isPackaged
    ? path.join(app.getPath('userData'), 'backups')
    : path.resolve('backups')
  const migrations = loadMigrationsFromDir(migrationsDir)
  await runMigrations(dbPath, migrations, backupsDir, {
    // Bootstrap the initial admin on FIRST migration (task 5.2): seeded by the
    // migration layer right after the schema exists — not on every startup.
    onFirstMigration: async (db) => {
      const hash = await hashPassword('admin123')
      bootstrapAdminUser(db, hash)
    },
  })
}

async function bootstrap(): Promise<void> {
  configureGuardDependencies({ getSession, writeAudit, touchSession })

  // Design A4: the MAIN process owns the idle watchdog. On expiry the session
  // singleton is invalidated (every guarded IPC call then fails with
  // PERMISSION_DENIED) and the renderer is told to drop to the login screen.
  setIdleExpiryHandler(() => {
    for (const window of BrowserWindow.getAllWindows()) {
      window.webContents.send('session:expired')
    }
  })

  const db = getDatabase()

  // Default lab logo and bioanalyst signature for PDF reports/exports: seed
  // assets/logo.jpeg and assets/signature.png as base64 data URIs the first
  // time no logo/signature is configured.
  const assetsDir = app.isPackaged ? path.join(process.resourcesPath, 'assets') : path.resolve('assets')
  ensureDefaultLogo(db, assetsDir)
  ensureDefaultSignature(db, assetsDir)

  registerAuthHandlers(db)
  registerUsersHandlers(db)
  registerPatientsHandlers(db)
  registerCatalogHandlers(db)
  registerMedicosHandlers(db)
  registerOrdersHandlers(db)
  registerSamplesHandlers(db)
  registerResultsHandlers(db)
  registerPaymentsHandlers(db)
  registerDashboardHandlers(db)
  registerReportsHandlers(db)
  registerConfigHandlers(db)
  registerBackupHandlers(db)
  registerAuditHandlers(db)
}

app.whenReady().then(async () => {
  try {
    await prepareDatabase()
    await bootstrap()
  } catch (error) {
    console.error('Failed to bootstrap application:', error)
    app.quit()
    return
  }

  createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('will-quit', () => {
  closeDatabase()
})
