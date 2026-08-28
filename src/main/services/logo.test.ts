import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createTestDb } from '../repositories/test-helpers'
import { getConfigValue, setConfigValue } from '../repositories/config'
import { ensureDefaultLogo, ensureDefaultSignature } from './logo'

// Minimal valid 1x1 JPEG (base64).
const JPEG_1PX = Buffer.from(
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AVN//2Q==',
  'base64',
)

// Minimal valid 1x1 PNG (base64).
const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
)

describe('ensureDefaultLogo', () => {
  let t: Awaited<ReturnType<typeof createTestDb>>
  let dir: string

  beforeEach(async () => {
    t = await createTestDb()
    dir = mkdtempSync(path.join(tmpdir(), 'labcore-logo-'))
  })

  afterEach(() => {
    t.cleanup()
    rmSync(dir, { recursive: true, force: true })
  })

  it('seeds lab_logo as a jpeg data URI when no logo is configured', () => {
    writeFileSync(path.join(dir, 'logo.jpeg'), JPEG_1PX)
    ensureDefaultLogo(t.db, dir)
    expect(getConfigValue(t.db, 'lab_logo')).toMatch(/^data:image\/jpeg;base64,/)
  })

  it('never overwrites an existing configured logo', () => {
    setConfigValue(t.db, 'lab_logo', 'data:image/png;base64,EXISTENTE')
    writeFileSync(path.join(dir, 'logo.jpeg'), JPEG_1PX)
    ensureDefaultLogo(t.db, dir)
    expect(getConfigValue(t.db, 'lab_logo')).toBe('data:image/png;base64,EXISTENTE')
  })

  it('is a no-op when the asset file is missing', () => {
    ensureDefaultLogo(t.db, dir)
    expect(getConfigValue(t.db, 'lab_logo')).toBeNull()
  })
})

describe('ensureDefaultSignature', () => {
  let t: Awaited<ReturnType<typeof createTestDb>>
  let dir: string

  beforeEach(async () => {
    t = await createTestDb()
    dir = mkdtempSync(path.join(tmpdir(), 'labcore-sig-'))
  })

  afterEach(() => {
    t.cleanup()
    rmSync(dir, { recursive: true, force: true })
  })

  it('seeds prof_firma as a png data URI when no signature is configured', () => {
    writeFileSync(path.join(dir, 'signature.png'), PNG_1PX)
    ensureDefaultSignature(t.db, dir)
    expect(getConfigValue(t.db, 'prof_firma')).toMatch(/^data:image\/png;base64,/)
  })

  it('never overwrites an existing configured signature', () => {
    setConfigValue(t.db, 'prof_firma', 'data:image/png;base64,EXISTENTE_FIRMA')
    writeFileSync(path.join(dir, 'signature.png'), PNG_1PX)
    ensureDefaultSignature(t.db, dir)
    expect(getConfigValue(t.db, 'prof_firma')).toBe('data:image/png;base64,EXISTENTE_FIRMA')
  })

  it('is a no-op when the signature asset file is missing', () => {
    ensureDefaultSignature(t.db, dir)
    expect(getConfigValue(t.db, 'prof_firma')).toBeNull()
  })
})
