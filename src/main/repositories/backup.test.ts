import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { createTestDb } from './test-helpers'
import { createBackup, getSchemaVersion, listBackups, restoreBackup } from './backup'

describe('backup repository', () => {
  let testDb: Awaited<ReturnType<typeof createTestDb>>

  beforeEach(async () => {
    testDb = await createTestDb()
  })

  afterEach(() => {
    testDb.cleanup()
  })

  it('creates a valid backup file', async () => {
    const backupPath = path.join(testDb.tmpDir, 'backup.db')
    const backup = await createBackup(testDb.db, backupPath)
    expect(fs.existsSync(backupPath)).toBe(true)
    expect(backup.size_bytes).toBeGreaterThan(0)
    expect(backup.path).toBe(backupPath)
  })

  it('reads schema version from a backup', async () => {
    const backupPath = path.join(testDb.tmpDir, 'backup.db')
    await createBackup(testDb.db, backupPath)
    const version = getSchemaVersion(backupPath)
    expect(version).toBeGreaterThanOrEqual(2)
  })

  it('lists backups in a directory', async () => {
    const backupsDir = path.join(testDb.tmpDir, 'repository-backups')
    fs.mkdirSync(backupsDir, { recursive: true })
    await createBackup(testDb.db, path.join(backupsDir, 'a.db'))
    await createBackup(testDb.db, path.join(backupsDir, 'b.db'))
    const list = listBackups(backupsDir)
    expect(list).toHaveLength(2)
  })

  it('restores a backup to a target path', async () => {
    const backupPath = path.join(testDb.tmpDir, 'backup.db')
    const targetPath = path.join(testDb.tmpDir, 'restored.db')
    await createBackup(testDb.db, backupPath)
    await restoreBackup(targetPath, backupPath)
    expect(fs.existsSync(targetPath)).toBe(true)
    expect(getSchemaVersion(targetPath)).toBeGreaterThanOrEqual(2)
  })
})
