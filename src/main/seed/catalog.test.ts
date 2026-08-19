import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { loadMigrationsFromDir, runMigrations } from '../migrations/runner'
import Database from 'better-sqlite3'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { seedCatalog } from './catalog'

async function createFreshDb(): Promise<{ db: Database.Database; tmpDir: string; cleanup: () => void }> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'labcore-seed-'))
  const dbPath = path.join(tmpDir, 'test.db')
  const backupsDir = path.join(tmpDir, 'backups')
  const migrationsDir = path.join(__dirname, '../migrations')
  const migrations = loadMigrationsFromDir(migrationsDir)
  await runMigrations(dbPath, migrations, backupsDir)
  const db = new Database(dbPath)
  db.pragma('foreign_keys = ON')
  return {
    db,
    tmpDir,
    cleanup: (): void => {
      db.close()
      fs.rmSync(tmpDir, { recursive: true, force: true })
    },
  }
}

describe('catalog seed', () => {
  let ctx: Awaited<ReturnType<typeof createFreshDb>>

  beforeEach(async () => {
    ctx = await createFreshDb()
  })

  afterEach(() => {
    ctx.cleanup()
  })

  it('seeds exams, parameters and reference ranges', () => {
    seedCatalog(ctx.db)

    const examCount = ctx.db.prepare('SELECT COUNT(*) as count FROM examenes_catalogo').get() as { count: number }
    expect(examCount.count).toBeGreaterThanOrEqual(8)

    const paramCount = ctx.db.prepare('SELECT COUNT(*) as count FROM parametros_examen').get() as { count: number }
    expect(paramCount.count).toBeGreaterThanOrEqual(26)

    const rangeCount = ctx.db.prepare('SELECT COUNT(*) as count FROM valores_referencia').get() as { count: number }
    expect(rangeCount.count).toBeGreaterThanOrEqual(13)
  })

  it('marks serology parameters as qualitative', () => {
    seedCatalog(ctx.db)

    const hiv = ctx.db
      .prepare('SELECT tipo_resultado, opciones_cualitativas FROM parametros_examen WHERE nombre = ?')
      .get('HIV 1/2') as { tipo_resultado: string; opciones_cualitativas: string }
    expect(hiv.tipo_resultado).toBe('cualitativo')
    expect(JSON.parse(hiv.opciones_cualitativas)).toEqual(['Reactivo', 'No Reactivo'])
  })

  it('sets age unit on reference ranges', () => {
    seedCatalog(ctx.db)

    const hemoglobin = ctx.db
      .prepare('SELECT edad_unidad FROM valores_referencia WHERE sexo = ? AND edad_min = ?')
      .get('M', 18) as { edad_unidad: string }
    expect(hemoglobin.edad_unidad).toBe('anios')
  })

  it('is idempotent', () => {
    seedCatalog(ctx.db)
    const firstExamCount = (ctx.db.prepare('SELECT COUNT(*) as count FROM examenes_catalogo').get() as { count: number }).count
    seedCatalog(ctx.db)
    const secondExamCount = (ctx.db.prepare('SELECT COUNT(*) as count FROM examenes_catalogo').get() as { count: number }).count
    expect(secondExamCount).toBe(firstExamCount)
  })
})
