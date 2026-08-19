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
import { configureGuardDependencies } from './ipc/register'
import { getSession } from './services/auth'
import { writeAudit } from './services/audit'

async function prepareDatabase(): Promise<void> {
  const dbPath = getDefaultDbPath()
  const migrationsDir = app.isPackaged
    ? path.join(process.resourcesPath, 'migrations')
    : path.resolve('src/main/migrations')
  const backupsDir = app.isPackaged
    ? path.join(app.getPath('userData'), 'backups')
    : path.resolve('backups')
  const migrations = loadMigrationsFromDir(migrationsDir)
  await runMigrations(dbPath, migrations, backupsDir)
}

async function bootstrap(): Promise<void> {
  configureGuardDependencies({ getSession, writeAudit })

  const db = getDatabase()
  const hash = await hashPassword('admin123')
  bootstrapAdminUser(db, hash)

  registerAuthHandlers(db)
  registerUsersHandlers(db)
  registerPatientsHandlers(db)
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
