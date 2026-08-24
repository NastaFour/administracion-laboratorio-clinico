import { BackupScreen } from '../backup/BackupScreen'

/**
 * Settings "Respaldo" tab (M13.3 split) — delegates to the real WU14 backup
 * screen (create / restore / import / export). No fake functionality is
 * stubbed here.
 */
export function Backup() {
  return <BackupScreen />
}
