# Design: LabCore Pro Rebuild (v2.0)

> Change: `labcore-pro-rebuild` · Store: openspec · Phase: sdd-design · 2026-08-18
> Inputs: `proposal.md` (D1–D11 FINAL), 15 capability specs (88 reqs / 97 scenarios), `exploration.md`, `project-context.md`.
> Contract: every spec requirement is satisfied; no requirements are added beyond specs.

## Technical Approach

Option B clean-slate: typed Electron 33 main process (`src/main`), sandboxed typed preload (`src/preload`), React 19 renderer (`src/renderer`), Zod 4 contracts (`src/shared`). All trust flows through IPC channels validated on BOTH sides; role guards live ONLY in main. v1 schema captured as idempotent `001_baseline`; `002_rebuild` adds tables/columns additively so the production DB upgrades in place with zero data loss. Clinical logic (ref-range selection, validation state machine, payment math) is extracted into pure main-process modules under RED-GREEN Vitest. PDF via Electron `printToPDF` with a redesigned generic template in a sandboxed offscreen window (no `webSecurity:false`). Delivery: 15 work units, stacked-to-main, ≤400 changed lines each.

## Architecture Decisions

| # | Decision | Option | Tradeoff | Chosen |
|---|----------|--------|----------|--------|
| A1 | Process layout | clean `src/{main,preload,renderer,shared}` vs refactor-in-place vs strangler | Strangler/refactor drag v1 rot forward | Clean-slate (D2); v1 = git-history reference only |
| A2 | DB driver | better-sqlite3 only vs keep dual | `sqlite3` has ZERO source imports (grep-verified); second native dep = double rebuild churn | Remove `sqlite3`; keep better-sqlite3 ^12.5 |
| A3 | Password hashing | bcryptjs (pure JS, cost 12) vs native bcrypt | Native bcrypt = second ABI-sensitive module to rebuild | bcryptjs — only better-sqlite3 stays native |
| A4 | Session persistence | main-process memory singleton vs `sesiones` table | M1.3 = session for app lifetime, single offline device; no refresh tokens, no JWT (jwt-bcrypt skill's cookie machinery is web-shaped, not desktop) | Memory session + idle lock; NO sesiones table |
| A5 | Vitest execution | `ELECTRON_RUN_AS_NODE=1 electron node_modules/vitest/vitest.mjs` vs `npm rebuild` for system Node | Electron 33 embeds Node 20 (ABI 130) = matches compiled better-sqlite3; system-Node rebuild churns ABI twice per build | Run Vitest under Electron's Node (gotcha #1) |
| A6 | PDF pipeline | `printToPDF` + shared HTML template vs Puppeteer vs PDFKit | Puppeteer ships a 2nd Chromium; PDFKit = manual layout | Electron-native, one template for preview AND print (WYSIWYG N11.1) |
| A7 | Renderer data fetching | Zustand 5 (session/toasts/config) + thin `useIpcQuery`/`useIpcMutation` vs TanStack Query vs Context | TanStack unjustified offline single-user; Context = re-render cost | Zustand 5 + hooks (exploration decision confirmed) |
| A8 | Styling | Tailwind 4 `@tailwindcss/vite` + `@theme` tokens vs PostCSS config vs CSS Modules everywhere | v4 plugin needs no PostCSS config; token layer kills the ~40 dead classes; CSS Modules only for PDF-preview/dense tables | Tailwind 4 plugin + token layer; `cn()` uses existing clsx/tailwind-merge |
| A9 | Backup encryption (N2.2) | AES-256-GCM on EXPORTED backups only vs all backups | Internal userData backups = same OS-scoped protection as the DB; external/USB copies are the exposure | Encrypt on export-to-external-media (passphrase at export); internal copies plain |
| A10 | Result band at report time | Recompute band from patient sex+age at report vs freeze at capture | Spec M4.3 mandates age at BOTH entry and report; recompute honors catalog corrections | Recompute; capture stores value + flag computed against the entry-time band |

## Data Flow

```
Renderer ──(typed api)──▶ Preload ──(validate req)──▶ Main ipc.register
  │                                                    │ 1. parse req (Zod, authoritative)
  │◀──(parse res)───────◀──(typed)─────────────────── │ 2. guard(role from MAIN session)
  │                                                    │ 3. service/repository (parameterized SQL)
  │                                                    │ 4. audit write (same transaction)
  │                                                    │ 5. envelope {ok:true,data}|{ok:false,error}
  │                                                    ▼
  └───────────────────────── better-sqlite3 (WAL, FK ON)
```

Validation + print sequence (complex flow, per `rules.design`):

```
Login   capture(value)        validate()        print()
  │         │                     │                │
  ▼         ▼                     ▼                ▼
bcrypt   band=selectBand(     state: Capturado   ReportData builder
verify   sex,ageUnit,age)     → Validado         (WHERE Validado only)
  │      flag=compute(value)   validado_por/en   offscreen win (sandbox,
  │      audit capturado       audit validado    webSecurity ON)
  └─────── guard(tecnico|bioanalista|admin)      loadFile(template)
                                   │             await fonts.ready via
                                   │             executeJavaScript
                                   │             printToPDF(A4) / print(dialog)
                                   │             audit reporte.impreso
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/main/index.ts`, `window.ts`, `ipc/register.ts`, `ipc/*.ipc.ts` (auth, patients, catalog, orders, samples, results, payments, reports, dashboard, config, backup, audit) | Create | Bootstrap (migrate → seed → register IPC → window); per-capability handler controllers; `handle(channel, roles, schema, fn)` wrapper enforcing guard+validation+envelope |
| `src/main/services/{db,migrations,auth,audit,referenceRanges,validation,payments,pdf,backup}.ts`, `src/main/migrations/001_baseline.sql`, `002_rebuild.sql`, `src/main/seed/catalog.ts` | Create | Pure/testable services; migration runner + SQL files; ported catalog seed |
| `src/preload/index.ts` | Create | `contextBridge` exposing typed `api.<domain>.<method>`; channel allowlist; validates requests + parses responses with shared Zod |
| `src/shared/contracts/*.ts`, `channels.ts`, `errors.ts`, `constants.ts` | Create | Zod 4 schemas per capability; `IpcChannels` map; envelope/error codes; role/state enums |
| `src/renderer/src/{app,stores,hooks,components,features,styles}` | Create | Router+auth gate; zustand stores; IPC hooks; design-system primitives; capability modules; Tailwind 4 `@theme` tokens |
| `package.json` | Modify | Remove `sqlite3`; add `zod`, `zustand`, `tailwindcss`+`@tailwindcss/vite`, `vitest`, `bcryptjs`; retarget `main` to `dist-electron/main.js` (new entry); add `postinstall: electron-rebuild -f -w better-sqlite3`, `test` script per A5 |
| `vite.config.ts` | Modify | New electron entries under `src/main`/`src/preload`; drop `sqlite3` from externals; add `@tailwindcss/vite` |
| `tsconfig*.json` | Modify | Split configs extended for `src/shared` visibility both sides |
| `electron/*`, root `src/*` | Retire (exclude from build/files) | Kept in git history as reference only (D2); never imported |
| `lab_clinical.db` (dev) | Modified at runtime | Upgraded in place by migrations 001/002 |

## Interfaces / Contracts

Envelope (every channel): `z.discriminatedUnion('ok', [ {ok: z.literal(true), data}, {ok: z.literal(false), error: z.object({code, message})} ])`. Codes: `VALIDATION_ERROR · PERMISSION_DENIED · NOT_FOUND · DUPLICATE · CONFLICT · DB_ERROR`. IDs: `z.number().int().positive()` everywhere (kills v1 parseInt chaos). Zod 4 idioms only: `z.email()`, `z.string().min(1)`, `{error: "…"}` param, ISO-8601 strings at the boundary. Types via `z.infer`; no `any`.

Channel inventory (domain → channels):

| Capability | Channels |
|---|---|
| auth-roles | `auth:login`, `auth:logout`, `auth:me`, `auth:changePassword` (Should), `users:list`, `users:create`, `users:update`, `users:disable`, `users:resetPassword` |
| patients | `patients:list`, `patients:search`, `patients:get`, `patients:create`, `patients:update`, `patients:deactivate`, `patients:merge` (Should), `patients:history` |
| exam-catalog | `catalog:listExams`, `catalog:saveExam`, `catalog:deactivateExam`, `catalog:listParams`, `catalog:saveParam`, `catalog:saveRange`, `catalog:deactivateParam`, `catalog:import`/`catalog:export` (Should) |
| reference-ranges | pure module `referenceRanges.selectBand()` + `computeFlag()` (no channels; consumed by `results:paramsForCapture` and reports) |
| orders | `orders:create`, `orders:update`, `orders:get`, `orders:list` (history filters), `orders:advanceStatus`, `orders:deliver`, `orders:void` (Should) |
| sampling | `samples:register`, `samples:list`, `samples:updateStatus`, `samples:reject`, `samples:label` (Should) |
| result-validation | `results:paramsForCapture`, `results:capture`, `results:validate`, `results:reject`, `results:reopen`, `results:comment` (Should) |
| pdf-reporting | `reports:preview`, `reports:print`, `reports:savePdf` |
| payments-cierre-caja | `payments:record`, `payments:cancel`, `payments:listForOrder`, `payments:balance`, `cierre:run`, `cierre:print`, `config:getBcvRate`, `config:setBcvRate` |
| history | via `orders:list` filters; `orders:getReportData` |
| dashboard | `dashboard:today`, `dashboard:debtors`, `dashboard:stats`, `dashboard:trends` |
| audit-log | `audit:list` (admin) |
| configuration | `config:getLab`, `config:setLab`, `config:setBioanalista`, `config:setLogo`, `config:getPrint`/`config:setPrint` (Should) |
| backup-import-export | `backup:create`, `backup:list`, `backup:restore`, `backup:prune` (Should), `import:preview`, `import:apply`, `export:filtered` (Should) |
| medico-referente | `medicos:list`, `medicos:save`, `medicos:deactivate` |

Role matrix (enforced in main only; unauthorized attempts are audited):

| Domain | admin | bioanalista | tecnico | recepcion |
|---|---|---|---|---|
| auth / own password | ✓ | ✓ | ✓ | ✓ |
| users CRUD / audit viewer / config / backup / merge / reopen / void | ✓ | — | — | — |
| catalog CRUD | ✓ | ✓ | read | read |
| patients CRUD + deactivate | ✓ | ✓ | ✓ | ✓ |
| orders create/edit | ✓ | ✓ | ✓ | ✓ |
| sampling register/status | ✓ | ✓ | ✓ | — |
| results capture | ✓ | ✓ | ✓ | — |
| results validate/reject | ✓ | ✓ | — | — |
| print/preview/history/dashboard | ✓ | ✓ | ✓ | ✓ |
| payments record/cancel · cierre · deliver | ✓ | — | — | ✓ |

## Database Design

Runner: `schema_version(version INTEGER PK, nombre TEXT, aplicado_en TIMESTAMP)`; on app start inside Electron (never system Node), each pending migration runs in one transaction; before the first migration a backup via better-sqlite3 `.backup()` to `userData/backups/pre-migration-<ts>.db`; failure → rollback + restore + typed error screen (N3.5).

`001_baseline.sql` — v1 schema verbatim from `electron/database.ts` (usuarios, pacientes+index, examenes_catalogo, parametros_examen, valores_referencia, ordenes, resultados, configuracion) plus the v1 try/catch ALTER columns folded into CREATE. All DDL `IF NOT EXISTS` → no-op on a v1 prod DB, identical fresh DB on a new install.

`002_rebuild.sql` — new tables: `orden_examenes(id, orden_id, examen_id, precio, tercerizado, proveedor, comentario, UNIQUE(orden_id, examen_id))`; `pagos(id, orden_id, cuenta_id NULL, metodo CHECK(pago_movil|transferencia|punto|efectivo|mixto), monto_bs, monto_usd, tasa_bcv, referencia, fecha, usuario_id, anulado, anulado_por, anulado_en)`; `cuentas_por_cobrar(id, paciente_id, orden_id NULL, monto_bs, monto_usd, saldo_bs, saldo_usd, autorizada, abierta, creado_por, creado_en, cerrado_en)`; `abonos(id, cuenta_id, pago_id NULL, monto_bs, monto_usd, tasa_bcv, fecha, usuario_id)`; `cierre_caja(id, fecha UNIQUE, total_bs, total_usd, tasa_bcv, usuario_id, creado_en, detalle_por_metodo JSON)`; `auditoria(id, usuario_id, accion, entidad, entidad_id, antes JSON, despues JSON, creado_en)` + indexes (usuario/entidad/creado_en); `medicos_referentes(id, nombre, cedula, especialidad, telefono, activo)`; `empresas(id, nombre, rif, contacto, activo)` — PLACEHOLDER only (D7); `muestras(id, orden_examen_id, tipo_muestra, codigo, estatus CHECK(Recolectada|En proceso|Resultada|Rechazada), motivo_rechazo, creado_en)`.

ALTERs: `examenes_catalogo` + `tercerizado`/`proveedor` (D7); `parametros_examen` + `tipo_resultado CHECK(numerico|cualitativo)` + `opciones_cualitativas` (JSON); `valores_referencia` + `edad_unidad CHECK(dias|meses|anios) DEFAULT 'anios'` (D9) + `valor_min_critico`/`valor_max_critico`; `ordenes` + `medico_id`, `empresa_id`, `credito` (authorized-credit flag, D5), `anulada`, `motivo_anulacion`, `cerrada` (lock-after-finalize); `resultados` + `valor_numerico`, `valor_cualitativo`, `estatus_validacion CHECK(Pendiente|Capturado|Validado) DEFAULT 'Pendiente'`, `validado_por`, `validado_en`, `flag` (bajo|alto|critico), `comentario`; `usuarios` + `ultimo_acceso_en`, `intentos_fallidos`, `bloqueado_hasta`, `debe_cambiar_clave` (bootstrap admin forces first-login change — necessity for a usable login, not a new spec req); `pacientes` + `activo DEFAULT 1`; new index `idx_pacientes_nombre` + phone index (N5.1).

Spec→storage map: auth→usuarios(+bcrypt); patients→pacientes; exam-catalog→examenes_catalogo/parametros_examen(+tercerizado); reference-ranges→valores_referencia(+edad_unidad/criticals); orders→ordenes/orden_examenes/medicos_referentes; sampling→muestras; result-validation→resultados validation columns; pdf→configuracion(logo base64, prof_*) + resultados(Validado filter); payments→pagos/cuentas_por_cobrar/abonos/cierre_caja + configuracion(bcv_tasa, bcv_actualizado); history/dashboard→aggregate queries over ordenes/resultados/pagos; audit→auditoria (INSERT-only repository; no UPDATE/DELETE paths, M12.4); configuration→configuracion; backup→file ops (no tables).

## Result Validation State Machine

`Pendiente → Capturado → Validado` (D8). Pure module `validation.ts` transition table:

| From | Event | Allowed roles | To | Side effects |
|---|---|---|---|---|
| Pendiente | capture | tecnico | Capturado | flag computed; audit `resultado.capturado` |
| Pendiente | capture | bioanalista/admin | Validado | + `validado_por/en` set (D8 immediate) |
| Capturado | validate | bioanalista/admin | Validado | `validado_por/en`; audit `resultado.validado` |
| Capturado | reject | bioanalista/admin | Pendiente | motivo stored; audit `resultado.rechazado` |
| Validado | reopen | admin | Pendiente | override reason; audit `resultado.reabierto` |

Print/deliver gate: PDF builder filters `WHERE estatus_validacion='Validado'`; `orders:deliver` blocked while any order exam lacks Validado results OR balance pending (unless `ordenes.credito=1`, D5).

## PDF Engine

Data assembly in main (`services/pdf.ts`): `buildReportData(orderId)` → typed `ReportData` (config header incl. logo as base64 data URL read from `userData/assets/logo`, patient header with exact age unit, exam groups, medico referente, results table rows with band+flag, validating bioanalist signature block from config `prof_*`). Template: single `report.html` + `report.css` (bundled fonts via local `@font-face`, no CDN — N1.1/N11.4) loaded with `loadFile` + `?payload=` query; offscreen window with `sandbox:true, contextIsolation:true, webSecurity:true` (NO `webSecurity:false` anywhere — N2.5). Font handshake: `await executeJavaScript("document.fonts.ready.then(() => true)")` before `printToPDF({pageSize:'A4', printBackground:true, margins})` — no fixed timeout (N11.4). Pagination: `@page { size: A4 }`, `break-inside: avoid` on rows/exam blocks, repeated `thead` (M8.2/N11.2). Preview = visible modal window loading the SAME template → WYSIWYG (N11.1). Print-to-printer via `webContents.print({silent:false})`; every print/save audited `reporte.impreso` (M8.8). Tercerizado provider NEVER in template (D7). COPIA watermark = CSS overlay flag (Should).

## Design System & Anti-AI-Slop

Tailwind 4 `@tailwindcss/vite` + `@theme` token layer in `src/renderer/src/styles/index.css`. Palette (no blue/purple gradient slop): warm clinical neutrals (`--color-paper` #FAF7F2 family, `--color-ink` warm near-black), deep petrol-teal primary (600≈hsl(186,45%,32%) — calm clinical trust, evidence: health-record UIs favor desaturated teals for long data-dense sessions), clay/terracotta accent (≈hsl(16,55%,52%)) for focus/status, semantic alert/ok amber-green; HSL 50–950 scales. Typography: bundled IBM Plex Sans (local files, no Google Fonts) + `font-variant-numeric: tabular-nums` for result tables; type scale ~12–28px. Spacing 4px/8pt grid; radius sm/md/lg; elevation shadow tokens; z-tokens (`z-modal`, `z-toast`); motion tokens (120/200/320ms) honoring `prefers-reduced-motion`. Component inventory: Button, IconButton, Input(+MaskedInput), Select, Card, DataTable, Modal (typed confirm variant for destructive ops — N2.6), Badge/StatusPill, Toast, Tabs, EmptyState, LockScreen. Light theme default (print-oriented); dark = Could.

## State Management

Zustand 5 stores: `useSessionStore` (user/role/login/idle-reset), `useToastStore`, `useConfigStore` (cached lab/BCV config, invalidated on save). Data: `useIpcQuery(channel, input)` → `{data, loading, error, refetch}` + `useIpcMutation(channel)` → `{mutate, loading}`; no server-state library. Main-process session = module singleton (`services/auth.ts`), idle watchdog (default 5 min, configurable) → `session:locked` event → LockScreen; every handler re-checks main session (renderer role never trusted).

## Security

bcryptjs cost 12 (N2.1); role guards in MAIN only; Zod on both IPC sides; parameterized SQL only; append-only `auditoria` with before/after JSON; audit covers all M12.2 scopes (capture/validate/reject/reopen/print/payments/config/users/import-export); login throttling (Should): `intentos_fallidos`/`bloqueado_hasta` in memory+column; exported backups AES-256-GCM (A9); no `webSecurity:false`, no `nodeIntegration`, `sandbox:true` everywhere; typed confirm dialogs replace native `confirm` (N2.6); `system:wipeData` NOT ported (dead v1 handler).

## Testing Strategy

| Layer | What | Approach |
|-------|------|-----------|
| Unit (clinical, RED-GREEN, ≥80% cov) | `referenceRanges` (age calc days/months/years, band selection incl. neonate+sex, flag/critical), `validation` state machine + role matrix, `payments` (Bs/USD+BCV, abonos balance, delivery-block, cierre consolidation) | Vitest, pure modules, table-driven |
| Unit (contracts) | every Zod schema round-trips valid/invalid payloads (N6.3) | Vitest per `src/shared/contracts` |
| Integration | migration runner: fresh-DB path + fixture v1 DB copy upgrade (001 no-op + 002 apply, zero data loss); repository CRUD on temp-file DB | Vitest — run under `ELECTRON_RUN_AS_NODE=1` (A5); NEVER the live dev DB from system Node |
| E2E | NOT in v2.0: no Electron-window/printToPDF automation; manual smoke checklist on lab printer (WU15) | — |

## Threat Matrix

N/A — no routing, shell commands, subprocesses, VCS/PR automation, executable-file classification, or process-integration boundary. Backups use `fs`/better-sqlite3 `.backup()` in-process; `app.relaunch()` after restore is the standard Electron API, not a subprocess; NSIS behavior is electron-builder default. No rows require RED tests.

## Migration / Rollout

Additive-only migrations (001/002); pre-migration auto-backup; rollback = restore backup + relaunch v1 binary. WU rollout stacked-to-main: WU1→2→3→4→(5,6)→7→8→9→(10,11)→12→(13,14)→15; sub-slices: WU3=3a runner+baseline/3b 002/3c repositories+seed, WU9=9a capture+bands/9b validation, WU10=10a template+data/10b print pipeline, WU11=11a payments+abonos/11b cierre. NSIS upgrade preserves `%APPDATA%/LabCore` (stable productName/appId; never `deleteAppDataOnUninstall`); documented pre-upgrade backup step (D11).

## 15-WU → Files Mapping (for sdd-tasks)

| WU | Modules/Files |
|----|---------------|
| WU1 | `package.json`, `vite.config.ts`, tsconfigs, `src/renderer` shell, `styles/index.css` tokens, `cn()`, Vitest config |
| WU2 | `src/shared/contracts/*`, `channels.ts`, `errors.ts`, `constants.ts`, `src/preload/index.ts` |
| WU3 (3a/3b/3c) | `services/db.ts`+`migrations.ts`+`migrations/001_baseline.sql`+`002_rebuild.sql`+`seed/catalog.ts`, `src/main/repositories/*`, migration tests |
| WU4 | `services/auth.ts`, `services/audit.ts`, `ipc/auth.ipc.ts`, `ipc/register.ts` guard wrapper, `useSessionStore`, Login/LockScreen |
| WU5 | `repositories/patients.ts`, `ipc/patients.ipc.ts`, `features/patients/*`, masks |
| WU6 | `services/referenceRanges.ts` + tests, `ipc/catalog.ipc.ts`, `features/catalog/*` |
| WU7 | `repositories/orders.ts`, `ipc/orders.ipc.ts` + `medicos`, `features/orders/*` |
| WU8 | `repositories/samples.ts`, `ipc/samples.ipc.ts`, `features/sampling/*` |
| WU9 (9a/9b) | `services/validation.ts` + tests, `ipc/results.ipc.ts`, `features/results/*` |
| WU10 (10a/10b) | `services/pdf.ts`, `report.html`/`report.css`/fonts, preview window, print audit |
| WU11 (11a/11b) | `services/payments.ts` + tests, `ipc/payments.ipc.ts`, `features/payments/*`, `features/cierre/*` |
| WU12 | `ipc/dashboard.ipc.ts` (real queries), `features/history/*`, `features/dashboard/*` + empty states + recharts |
| WU13 | `ipc/config.ipc.ts`, `features/settings/*` (5 screens), logo asset upload |
| WU14 | `services/backup.ts` (backup/restore/import/export, A9 encryption), `features/backup/*` |
| WU15 | `postinstall` electron-rebuild, NSIS config, es-VE locale pass, a11y pass, icon, smoke checklist |

## Cross-Cutting NFRs

Offline (N1): zero network imports in main (review-enforced); local fonts; manual BCV entry. Perf (N5): indexed search `<100 ms`; PDF `<3 s`; async IPC only. Usability (N8): keyboard-first, Enter-to-save, masks, status pills always visible, plain-Spanish errors. Locale (N9): `Intl.DateTimeFormat('es-VE')`, `dd/mm/yyyy`, Bs formatting, V-/E- cédula, all UI strings in an `i18n/es-ve.ts` dictionary; artifacts stay English. A11y (N10): semantic HTML, labels, visible focus, AA contrast on tables.

## Open Questions

- [ ] Lab logo asset + real bioanalist credentials availability for config seeding (WU13 dependency, per proposal).
- [ ] Default idle-lock timeout (proposed 5 min) — user confirmation at WU4.
- [ ] Should-feature capacity call at sdd-tasks (change-password/throttle/merge/labels/reject-reason/COPIA/auto-backup/charts/CSV-export/print-defaults): commit or defer to v2.1.
