import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { loadMigrationsFromDir, runMigrations, MigrationError } from './runner'

const V1_DDL = `
  CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    nombre_completo TEXT NOT NULL,
    rol TEXT CHECK(rol IN ('admin', 'bioanalista', 'tecnico', 'recepcion')) DEFAULT 'tecnico',
    activo INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS pacientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cedula TEXT UNIQUE NOT NULL,
    nombres TEXT NOT NULL,
    apellidos TEXT NOT NULL,
    fecha_nacimiento DATE NOT NULL,
    sexo TEXT CHECK(sexo IN ('M', 'F', 'O')) NOT NULL,
    telefono TEXT,
    email TEXT,
    direccion TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_pacientes_cedula ON pacientes(cedula);

  CREATE TABLE IF NOT EXISTS examenes_catalogo (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo TEXT UNIQUE NOT NULL,
    nombre TEXT NOT NULL,
    categoria TEXT NOT NULL,
    muestra TEXT DEFAULT 'Sangre',
    precio REAL DEFAULT 0.0,
    activo INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS parametros_examen (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    examen_id INTEGER REFERENCES examenes_catalogo(id),
    nombre TEXT NOT NULL,
    orden INTEGER NOT NULL,
    unidad TEXT
  );

  CREATE TABLE IF NOT EXISTS valores_referencia (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    parametro_id INTEGER REFERENCES parametros_examen(id),
    sexo TEXT CHECK(sexo IN ('M', 'F', 'Ambos')) DEFAULT 'Ambos',
    edad_min INTEGER DEFAULT 0,
    edad_max INTEGER DEFAULT 120,
    valor_min REAL,
    valor_max REAL,
    interpretacion TEXT
  );

  CREATE TABLE IF NOT EXISTS ordenes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    paciente_id INTEGER REFERENCES pacientes(id),
    fecha_solicitud TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    estatus TEXT CHECK(estatus IN ('Pendiente', 'Procesando', 'Completada', 'Entregada')) DEFAULT 'Pendiente',
    observaciones TEXT,
    precio_total REAL DEFAULT 0.0,
    estatus_pago TEXT CHECK(estatus_pago IN ('Pendiente', 'Pagado')) DEFAULT 'Pendiente'
  );

  CREATE TABLE IF NOT EXISTS resultados (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    orden_id INTEGER REFERENCES ordenes(id),
    parametro_id INTEGER REFERENCES parametros_examen(id),
    valor_texto TEXT,
    fecha_resultado TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS configuracion (
    clave TEXT PRIMARY KEY,
    valor TEXT
  );
`

function createV1Fixture(dbPath: string): void {
  const db = new Database(dbPath)
  try {
    db.exec(V1_DDL)
    db.exec(`
      INSERT INTO configuracion (clave, valor) VALUES ('lab_nombre', 'LAB V1');
      INSERT INTO examenes_catalogo (codigo, nombre, categoria, muestra, precio) VALUES ('CUSTOM01', 'Custom Exam', 'Custom', 'Sangre', 99.00);
      INSERT INTO pacientes (cedula, nombres, apellidos, fecha_nacimiento, sexo) VALUES ('V-12345678', 'Juan', 'Pérez', '1985-03-15', 'M');
    `)
  } finally {
    db.close()
  }
}

describe('migration runner', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'labcore-migrations-'))
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('loads migrations from directory ordered by version', () => {
    const migrationsDir = path.join(tmpDir, 'migrations')
    fs.mkdirSync(migrationsDir)
    fs.writeFileSync(path.join(migrationsDir, '002_second.sql'), '-- second')
    fs.writeFileSync(path.join(migrationsDir, '001_first.sql'), '-- first')
    fs.writeFileSync(path.join(migrationsDir, 'readme.md'), 'not a migration')

    const migrations = loadMigrationsFromDir(migrationsDir)
    expect(migrations).toHaveLength(2)
    expect(migrations[0].version).toBe(1)
    expect(migrations[0].name).toBe('first')
    expect(migrations[1].version).toBe(2)
    expect(migrations[1].name).toBe('second')
  })

  it('applies 001_baseline to a fresh DB and seeds defaults', async () => {
    const dbPath = path.join(tmpDir, 'fresh.db')
    const backupsDir = path.join(tmpDir, 'backups')
    const migrationsDir = path.join(tmpDir, 'migrations')
    fs.mkdirSync(migrationsDir)
    fs.copyFileSync(
      path.join(__dirname, '001_baseline.sql'),
      path.join(migrationsDir, '001_baseline.sql'),
    )

    const migrations = loadMigrationsFromDir(migrationsDir)
    const result = await runMigrations(dbPath, migrations, backupsDir)

    expect(result.initialVersion).toBe(0)
    expect(result.finalVersion).toBe(1)
    expect(result.applied).toHaveLength(1)
    expect(result.backupPath).not.toBeNull()
    expect(fs.existsSync(result.backupPath!)).toBe(true)

    const db = new Database(dbPath)
    try {
      const version = db.prepare('SELECT version, nombre FROM schema_version').get() as {
        version: number
        nombre: string
      }
      expect(version.version).toBe(1)
      expect(version.nombre).toBe('baseline')

      const configCount = db.prepare('SELECT COUNT(*) as count FROM configuracion').get() as {
        count: number
      }
      expect(configCount.count).toBeGreaterThan(0)

      const examCount = db.prepare('SELECT COUNT(*) as count FROM examenes_catalogo').get() as {
        count: number
      }
      expect(examCount.count).toBeGreaterThan(0)
    } finally {
      db.close()
    }
  })

  it('recognizes an existing v1 DB at schema_version 1 without re-running DDL', async () => {
    const dbPath = path.join(tmpDir, 'v1.db')
    const backupsDir = path.join(tmpDir, 'backups')
    createV1Fixture(dbPath)

    const migrationsDir = path.join(tmpDir, 'migrations')
    fs.mkdirSync(migrationsDir)
    fs.copyFileSync(
      path.join(__dirname, '001_baseline.sql'),
      path.join(migrationsDir, '001_baseline.sql'),
    )

    const migrations = loadMigrationsFromDir(migrationsDir)
    const result = await runMigrations(dbPath, migrations, backupsDir)

    expect(result.initialVersion).toBe(0)
    expect(result.finalVersion).toBe(1)
    expect(result.applied).toHaveLength(0)
    expect(result.backupPath).toBeNull()

    const db = new Database(dbPath)
    try {
      const version = db.prepare('SELECT version FROM schema_version').get() as { version: number }
      expect(version.version).toBe(1)

      const config = db.prepare('SELECT valor FROM configuracion WHERE clave = ?').get('lab_nombre') as {
        valor: string
      }
      expect(config.valor).toBe('LAB V1')

      const custom = db.prepare('SELECT codigo FROM examenes_catalogo WHERE codigo = ?').get('CUSTOM01') as {
        codigo: string
      }
      expect(custom.codigo).toBe('CUSTOM01')

      const patient = db.prepare('SELECT cedula FROM pacientes WHERE cedula = ?').get('V-12345678') as {
        cedula: string
      }
      expect(patient.cedula).toBe('V-12345678')
    } finally {
      db.close()
    }
  })

  it('restores the DB from backup when a migration fails', async () => {
    const dbPath = path.join(tmpDir, 'fresh.db')
    const backupsDir = path.join(tmpDir, 'backups')

    const migrations = [
      {
        version: 1,
        name: 'baseline',
        sql: 'CREATE TABLE IF NOT EXISTS demo (id INTEGER PRIMARY KEY);',
      },
      {
        version: 2,
        name: 'broken',
        sql: 'CREATE TABLE demo (id INTEGER PRIMARY KEY);',
      },
    ]

    let error: MigrationError | undefined
    try {
      await runMigrations(dbPath, migrations, backupsDir)
    } catch (e) {
      error = e as MigrationError
    }

    expect(error).toBeDefined()
    expect(error?.code).toBe('MIGRATION_FAILED')
    expect(error?.backupPath).toBeDefined()
    expect(fs.existsSync(error!.backupPath!)).toBe(true)

    const db = new Database(dbPath)
    try {
      const tables = db
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
        .all() as Array<{ name: string }>
      const tableNames = tables.map((t) => t.name)
      expect(tableNames).not.toContain('demo')
      expect(tableNames).toContain('schema_version')
      const version = db.prepare('SELECT version FROM schema_version').get() as {
        version: number | null
      } | undefined
      expect(version?.version ?? 0).toBe(0)
    } finally {
      db.close()
    }
  })

  it('is idempotent: running twice on a fresh DB only applies once', async () => {
    const dbPath = path.join(tmpDir, 'fresh.db')
    const backupsDir = path.join(tmpDir, 'backups')
    const migrationsDir = path.join(tmpDir, 'migrations')
    fs.mkdirSync(migrationsDir)
    fs.copyFileSync(
      path.join(__dirname, '001_baseline.sql'),
      path.join(migrationsDir, '001_baseline.sql'),
    )

    const migrations = loadMigrationsFromDir(migrationsDir)
    const first = await runMigrations(dbPath, migrations, backupsDir)
    expect(first.applied).toHaveLength(1)

    const second = await runMigrations(dbPath, migrations, backupsDir)
    expect(second.initialVersion).toBe(1)
    expect(second.finalVersion).toBe(1)
    expect(second.applied).toHaveLength(0)
    expect(second.backupPath).toBeNull()
  })

  it('applies 002_rebuild to a v1 fixture, keeps v1 data, and records schema_version 2', async () => {
    const dbPath = path.join(tmpDir, 'v1.db')
    const backupsDir = path.join(tmpDir, 'backups')
    createV1Fixture(dbPath)

    const migrationsDir = path.join(tmpDir, 'migrations')
    fs.mkdirSync(migrationsDir)
    fs.copyFileSync(
      path.join(__dirname, '001_baseline.sql'),
      path.join(migrationsDir, '001_baseline.sql'),
    )
    fs.copyFileSync(
      path.join(__dirname, '002_rebuild.sql'),
      path.join(migrationsDir, '002_rebuild.sql'),
    )

    const migrations = loadMigrationsFromDir(migrationsDir)
    const result = await runMigrations(dbPath, migrations, backupsDir)

    expect(result.initialVersion).toBe(0)
    expect(result.finalVersion).toBe(2)
    expect(result.applied).toHaveLength(1)
    expect(result.applied[0].version).toBe(2)
    expect(result.applied[0].name).toBe('rebuild')
    expect(result.backupPath).not.toBeNull()
    expect(fs.existsSync(result.backupPath!)).toBe(true)

    const db = new Database(dbPath)
    try {
      const version = db.prepare('SELECT version, nombre FROM schema_version WHERE version = 2').get() as {
        version: number
        nombre: string
      }
      expect(version.version).toBe(2)
      expect(version.nombre).toBe('rebuild')

      const config = db.prepare('SELECT valor FROM configuracion WHERE clave = ?').get('lab_nombre') as {
        valor: string
      }
      expect(config.valor).toBe('LAB V1')

      const custom = db.prepare('SELECT codigo FROM examenes_catalogo WHERE codigo = ?').get('CUSTOM01') as {
        codigo: string
      }
      expect(custom.codigo).toBe('CUSTOM01')

      const patient = db.prepare('SELECT cedula FROM pacientes WHERE cedula = ?').get('V-12345678') as {
        cedula: string
      }
      expect(patient.cedula).toBe('V-12345678')

      function tableExists(name: string): boolean {
        const row = db
          .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?")
          .get(name) as { 1: number } | undefined
        return row !== undefined
      }

      function columnExists(table: string, column: string): boolean {
        const rows = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>
        return rows.some((row) => row.name === column)
      }

      const newTables = [
        'orden_examenes',
        'pagos',
        'cuentas_por_cobrar',
        'abonos',
        'cierre_caja',
        'auditoria',
        'medicos_referentes',
        'empresas',
        'muestras',
        'bcv_historial',
      ]
      for (const table of newTables) {
        expect(tableExists(table), `expected table ${table} to exist`).toBe(true)
      }

      expect(columnExists('examenes_catalogo', 'tercerizado')).toBe(true)
      expect(columnExists('examenes_catalogo', 'proveedor')).toBe(true)
      expect(columnExists('parametros_examen', 'tipo_resultado')).toBe(true)
      expect(columnExists('parametros_examen', 'opciones_cualitativas')).toBe(true)
      expect(columnExists('valores_referencia', 'edad_unidad')).toBe(true)
      expect(columnExists('valores_referencia', 'valor_min_critico')).toBe(true)
      expect(columnExists('valores_referencia', 'valor_max_critico')).toBe(true)
      expect(columnExists('ordenes', 'medico_id')).toBe(true)
      expect(columnExists('ordenes', 'empresa_id')).toBe(true)
      expect(columnExists('ordenes', 'credito')).toBe(true)
      expect(columnExists('ordenes', 'anulada')).toBe(true)
      expect(columnExists('ordenes', 'motivo_anulacion')).toBe(true)
      expect(columnExists('ordenes', 'cerrada')).toBe(true)
      expect(columnExists('resultados', 'valor_numerico')).toBe(true)
      expect(columnExists('resultados', 'valor_cualitativo')).toBe(true)
      expect(columnExists('resultados', 'estatus_validacion')).toBe(true)
      expect(columnExists('resultados', 'validado_por')).toBe(true)
      expect(columnExists('resultados', 'validado_en')).toBe(true)
      expect(columnExists('resultados', 'flag')).toBe(true)
      expect(columnExists('resultados', 'comentario')).toBe(true)
      expect(columnExists('usuarios', 'ultimo_acceso_en')).toBe(true)
      expect(columnExists('usuarios', 'intentos_fallidos')).toBe(true)
      expect(columnExists('usuarios', 'bloqueado_hasta')).toBe(true)
      expect(columnExists('usuarios', 'debe_cambiar_clave')).toBe(true)
      expect(columnExists('pacientes', 'activo')).toBe(true)
    } finally {
      db.close()
    }
  })
})

describe('bootstrap admin seed on first migration (WU13)', () => {
  let tmpDir: string
  let dbPath: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'labcore-seed-'))
    dbPath = path.join(tmpDir, 'test.db')
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('RED: onFirstMigration runs once with the open db when migrations are applied', async () => {
    const migrations = loadMigrationsFromDir(path.resolve(__dirname))
    const seeded = vi.fn((db: Database.Database) => {
      db.prepare(
        "INSERT INTO usuarios (username, password_hash, nombre_completo, rol, activo, debe_cambiar_clave) VALUES ('admin', 'hash', 'Administrador', 'admin', 1, 1)",
      ).run()
    })

    const result = await runMigrations(dbPath, migrations, path.join(tmpDir, 'backups'), {
      onFirstMigration: seeded,
    })

    expect(result.applied.length).toBeGreaterThan(0)
    expect(seeded).toHaveBeenCalledTimes(1)

    const db = new Database(dbPath)
    try {
      const admin = db
        .prepare("SELECT id, username, debe_cambiar_clave FROM usuarios WHERE username = 'admin'")
        .get() as { id: number; username: string; debe_cambiar_clave: number } | undefined
      expect(admin).toBeDefined()
      expect(admin?.debe_cambiar_clave).toBe(1)
    } finally {
      db.close()
    }
  })

  it('RED: onFirstMigration does NOT run when no migration is pending', async () => {
    const migrations = loadMigrationsFromDir(path.resolve(__dirname))
    await runMigrations(dbPath, migrations, path.join(tmpDir, 'backups'))

    const seeded = vi.fn()
    const second = await runMigrations(
      dbPath,
      migrations,
      path.join(tmpDir, 'backups'),
      { onFirstMigration: seeded },
    )

    expect(second.applied).toHaveLength(0)
    expect(seeded).not.toHaveBeenCalled()
  })
})
