# Backup, Import, Export & Migrations Specification

## Purpose

Manual and automatic backup, validated restore, import/merge with conflict preview, dead-handler removal, and the numbered transactional migration runner that upgrades the production v1 DB in place with zero data loss.

## Requirements

### Requirement: Numbered transactional migration runner [NFR N3.1, N3.2, N3.3, N3.5]

The system MUST provide a migration runner with a `schema_version` table and numbered, transactional SQL migrations run inside Electron (respecting the better-sqlite3 ABI constraint). Migration `001_baseline` captures the v1 schema verbatim; `002_rebuild` adds new tables/columns. The production DB MUST upgrade in place with zero data loss, and an automatic backup MUST run before any migration with rollback on failure.

#### Scenario: Production v1 DB upgrades in place

- GIVEN a production v1 DB at migration 0
- WHEN the app launches and runs migrations
- THEN `001_baseline` is recognized (no-op) and `002_rebuild` applies transactionally with a pre-migration backup

#### Scenario: Failed migration rolls back to backup

- GIVEN `002_rebuild` fails mid-way
- WHEN the transaction rolls back
- THEN the DB is restored to the pre-migration backup and the app reports the failure

### Requirement: Manual full backup [FR M14.1, N4.1, N4.3]

The system MUST support a manual full backup via SQLite file copy to a user-chosen path, exportable to removable media.

#### Scenario: Backup to a USB path

- GIVEN the user triggers a manual backup to a USB path
- WHEN the backup completes
- THEN a valid SQLite file copy exists at the chosen path

### Requirement: Automatic periodic backup [FR M14.2] (Should — v2.0 if capacity allows, N4.2)

The system SHOULD back up automatically to `userData/backups` with a retention policy (keep last N, prune older).

#### Scenario: Retention prunes the oldest

- GIVEN automatic backups are enabled with retention 10
- WHEN an 11th backup is created
- THEN the oldest is pruned

### Requirement: Restore with validation [FR M14.3, N4.4]

The system MUST support restore (replace) with a preventive backup and relaunch, and MUST validate `schema_version` before replacing.

#### Scenario: Incompatible schema_version is rejected

- GIVEN a backup file with an incompatible schema_version
- WHEN the user attempts to restore it
- THEN the restore is rejected with a clear error

#### Scenario: Valid backup restores with preventive backup

- GIVEN a valid backup file
- WHEN the user restores it
- THEN a preventive backup is taken, the DB is replaced, and the app relaunches

### Requirement: Import/merge with conflict preview [FR M14.4]

The system MUST support import/merge with a conflict preview for patients and catalog.

#### Scenario: Conflicts are previewed before applying

- GIVEN an import file has patients whose cédulas exist locally
- WHEN the user runs import/merge
- THEN a conflict preview lists duplicates with options to skip, overwrite, or keep both before applying

### Requirement: Remove dead handlers [FR M14.6]

The system MUST remove the dead v1 handlers (`system:importData`, `system:backup` unused) and the broken `mergeService` path.

#### Scenario: No legacy handlers remain

- GIVEN the new codebase is built
- WHEN dead-handler references are searched
- THEN no `system:importData` or `system:backup` legacy handlers remain

### Requirement: Export filtered dataset [FR M14.5] (Should — v2.0 if capacity allows)

The system SHOULD export a filtered dataset (by date range) as CSV/JSON.

#### Scenario: Filtered CSV export

- GIVEN the user selects a date range and CSV format
- WHEN export runs
- THEN a CSV containing only orders in that range is produced
