# Project Context — LabCore (aplicacion-para-laboratorio-clinico)

Detected: 2026-08-18 by `sdd-init`. Persistence: openspec.
Canonical summary also in `openspec/config.yaml`.

## Product Decision (user-owned, authoritative)

Rebuild as a **desktop pro** application: Electron + React 19 + TypeScript + better-sqlite3,
offline-first, for ONE Venezuelan clinical laboratory. NOT a web SaaS, NOT mobile, NOT multi-tenant.

## Stack (detected from package.json)

| Concern | Choice |
|---|---|
| Shell | Electron 33 |
| Dev/build | Vite 7 + vite-plugin-electron 0.29 + vite-plugin-electron-renderer |
| UI | React 19.2 (React Compiler NOT enabled — stock template) |
| Language | TypeScript ~5.9.3 (tsconfig.app.json for renderer, tsconfig.node.json for electron) |
| DB | better-sqlite3 ^12.5 (primary). NOTE: `sqlite3` ^5.1.7 is ALSO a dependency — verify during design whether it is legacy/unused |
| Packaging | electron-builder 26 — NSIS, appId `com.labcore.app`, productName `LabCore`, output `release/`, icon `public/icon.ico` |
| Package manager | plain npm (NOT pnpm; NOT a monorepo) |
| Lint | eslint 9 + typescript-eslint 8 + react-hooks + react-refresh (`npm run lint`) |
| Type check | `tsc -b` (runs inside `npm run build`) |
| Test runner | NONE — see `openspec/testing-capabilities.md` |
| Formatter | none configured |
| CI | none configured |

## Process Layout (detected)

- `electron/` — main process: `main.ts`, `preload.ts`, `database.ts`, `ipcHandlers.ts`, `mergeService.ts`, `pdfTemplate.ts`, `systemServices.ts`
- `src/` — renderer (React): `components/`, `hooks/`, `services/`, `db/`, `ipc/`, `assets/`, `App.tsx`
- `dist-electron/`, `dist/` — build outputs; `release/` — electron-builder output
- `lab_clinical.db` — repo root in dev; `userData` in production
- DB pragmas: WAL mode, `foreign_keys` ON

## Gotchas (recorded for ALL phases)

1. **better-sqlite3 ABI mismatch**: the native module is compiled against Electron's Node
   (NODE_MODULE_VERSION 130); system Node is v24 (137). Any Node CLI script that opens the DB
   outside Electron fails with `ERR_DLOPEN_FAILED` until rebuilt
   (`npm rebuild better-sqlite3` / `@electron/rebuild`). Never write one-off verification or
   debug scripts that open `lab_clinical.db` under system Node without rebuilding first.
2. **Spaces in project path**: always quote paths in shell commands and scripts.
3. **AGENTS.md is a foreign architecture guide**: the repo-root `AGENTS.md` is the portable
   skill-catalog guide written for a DIFFERENT stack (pnpm monorepo, Expo, Express/Prisma/PostgreSQL).
   Its stack-specific rules do NOT apply where they conflict with the desktop reality. Its generic
   quality rules (no `any` in TS, SOLID/DRY, SDD for changes touching 2+ files) DO apply.
4. **tailwind-merge and clsx** are installed but unused (no Tailwind/PostCSS config). Decide: adopt or remove.
5. **README.md** is the stock Vite React template — not real project documentation.
   `PROBLEMAS_ARREGLADOS.md` (Spanish) is an informal fixed-issues log; treat as tribal knowledge, not spec.

## Conventions Observed

- English technical artifacts (SDD/openspec files) per orchestration contract.
- ESLint flat config (`eslint.config.js`); no Prettier/Biome.
- TypeScript strict split configs: `tsconfig.app.json` (renderer) / `tsconfig.node.json` (electron + vite config).

## Open Decisions for the Design Phase

1. **Test runner**: add Vitest (and optionally @testing-library/react). `strict_tdd` stays
   disabled until a runner exists.
2. **Dual sqlite dependency**: better-sqlite3 vs `sqlite3` — confirm which is live and remove the other.
3. **State management**: no zustand/redux installed; React 19 hooks only so far. Decide the pattern.
4. **Styling**: no Tailwind/PostCSS setup despite tailwind-merge/clsx present; `src/index.css` exists.
