# LabCore

Offline-first desktop application for a single Venezuelan clinical laboratory.
Built for daily use by a non-technical bioanalyst and 1–2 reception/technician
users. All patient data lives in a local SQLite database (`better-sqlite3`) under
Electron's per-user `userData` directory — nothing is sent over the network.

## Stack

| Layer | Technology |
|---|---|
| Desktop shell | Electron 33 |
| UI | React 19 + Vite 7 + Tailwind CSS 4 + Zustand 5 |
| Language | TypeScript 5.9 |
| Database | better-sqlite3 (WAL, foreign keys ON) |
| Validation | Zod 4 (shared contracts validated on both IPC sides) |
| Tests | Vitest (run under Electron's embedded Node — see below) |
| Packaging | electron-builder (NSIS) |

The renderer UI and the report template are Spanish (es-VE). Technical
artifacts — code, identifiers, comments, this README — are English.

## Development

```powershell
npm install        # runs electron-rebuild -f -w better-sqlite3 (postinstall)
npm run dev        # Vite + Electron with HMR
```

> **Do NOT run `npm rebuild` or `npm install` against system Node.** `better-sqlite3`
> is compiled for Electron's ABI (Node 20, ABI 130). Tests and any script that
> opens the database must run under Electron's Node:
> `$env:ELECTRON_RUN_AS_NODE=1` (the `test` script does this for you).

## Commands

```powershell
npm test           # Vitest under ELECTRON_RUN_AS_NODE=1
npm run lint       # ESLint
npm run build      # tsc --noEmit + vite build (dist/ + dist-electron/)
npm run package    # build + electron-builder --win --dir (unpacked NSIS output)
npm run dist       # build + electron-builder --win (installer .exe)
```

## Packaging

electron-builder configuration lives in `electron-builder.yml`:

- **Stable identity** — `appId: com.labcore.app`, `productName: LabCore`.
  The per-user data directory is derived from `productName`, so it must never
  change: upgrading installs read the same `%APPDATA%/LabCore` userData.
- **NSIS upgrade-install** — `deleteAppDataOnUninstall: false`. The installer
  never touches `%APPDATA%/LabCore`, so the database survives both upgrade-install
  and uninstall.

### Pre-upgrade backup (REQUIRED before installing a new version)

The production database (`lab_clinical.db`) lives in `%APPDATA%/LabCore` and is
upgraded in place by migrations on first launch of a new version. Before
installing an upgrade:

1. Open **Configuración → Respaldo** and run **Crear respaldo**, choosing a
   location outside the app data folder (e.g. a USB drive or a separate
   `Respaldos` folder).
2. Confirm the backup file exists and opens (Restaurar is validated against the
   schema version before any write).
3. Then install the new version. Migrations also take an automatic pre-migration
   backup into `userData/backups/` before applying.

If a migration fails, it rolls back and restores the pre-migration backup — you
can also reinstall the previous version against your manual backup.

## Locale & accessibility

- es-VE formatting is centralized in `src/renderer/src/i18n/es-ve.ts`:
  `dd/mm/yyyy` dates, `Bs` currency, `V-`/`E-` cédula validation, and a UI
  dictionary.
- Keyboard-first: forms use visible focus rings, every input has an accessible
  label, and data tables meet WCAG AA contrast.

## Release smoke checklist (WU15)

Before shipping an installer, verify in order:

1. `npm test` — all suites green.
2. `npm run lint` — 0 errors / 0 warnings.
3. `npm run build` — `dist/` + `dist-electron/` produced (template + fonts copied).
4. `npm run package` — NSIS unpacked build under `release/`.
5. Install the new version **over** an existing v1/v2 install with real
   `%APPDATA%/LabCore` data — confirm the database is intact, the previous
   version's patients/results still load, and no re-configuration is required.
