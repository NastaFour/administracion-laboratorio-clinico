import fs from 'node:fs'
import path from 'node:path'
import type Database from 'better-sqlite3'
import { getConfigValue, setConfigValue } from '../repositories/config'

const LOGO_FILENAME = 'logo.jpeg'
const SIGNATURE_FILENAME = 'signature.png'

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

/**
 * Seed the default bioanalyst signature/stamp on first run (or whenever no signature
 * was configured): reads `assets/signature.png` and stores it as a base64 image data URI
 * under `prof_firma`. A user-configured signature is never overwritten, and a missing asset
 * file is a no-op.
 */
export function ensureDefaultSignature(db: Database.Database, assetsDir: string): void {
  if (getConfigValue(db, 'prof_firma')) {
    return
  }
  let buffer: Buffer
  try {
    buffer = fs.readFileSync(path.join(assetsDir, SIGNATURE_FILENAME))
  } catch {
    return
  }
  setConfigValue(db, 'prof_firma', `data:image/png;base64,${buffer.toString('base64')}`)
}

