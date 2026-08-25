import fs from 'node:fs'
import path from 'node:path'
import type Database from 'better-sqlite3'
import { getConfigValue, setConfigValue } from '../repositories/config'

const LOGO_FILENAME = 'logo.jpeg'

/**
 * Seed the default lab logo on first run (or whenever no logo was ever
 * uploaded): reads `assets/logo.jpeg` and stores it as a base64 image data URI
 * under `lab_logo`, which the PDF report pipeline already consumes (N11.3
 * data-URI gate, `resolveLogo`). A user-configured logo is never overwritten,
 * and a missing asset file is a no-op.
 */
export function ensureDefaultLogo(db: Database.Database, assetsDir: string): void {
  if (getConfigValue(db, 'lab_logo')) {
    return
  }
  let buffer: Buffer
  try {
    buffer = fs.readFileSync(path.join(assetsDir, LOGO_FILENAME))
  } catch {
    return
  }
  setConfigValue(db, 'lab_logo', `data:image/jpeg;base64,${buffer.toString('base64')}`)
}
