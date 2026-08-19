# Tasks: LabCore Pro Rebuild (v2.0)

> Change: `labcore-pro-rebuild` · Store: openspec · 2026-08-18
> Inputs: `proposal.md` (D1–D11), 15 capability specs (88 reqs / 97 scenarios), `design.md`, `exploration.md`, `project-context.md`.
> Design gate handoffs folded in: BCV rate history (M13.2 + WU11 read), sample-status Validado side effect (WU9b → WU8 read), credit authorization channel + role guard (WU7 write + WU11 deliver gate).

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Total estimated changed lines | ~6,200 (15 WUs + sub-slices, incl. tests & migrations) |
| Largest single WU estimate | WU6a+WU6b ~580 lines → MUST be sub-sliced beyond the design baseline |
| 400-line budget risk | High (WU4 / WU6 / WU12 / WU13 at-or-near 400) |
| Chained PRs recommended | Yes |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |
| Suggested split | 22 PRs (one per WU; sub-slices 3a/3b/3c, 9a/9b, 10a/10b, 11a/11b each → own PR; WU6 → 6a/6b) |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| WU1 | Scaffold + Vitest + tokens | PR1 | `ELECTRON_RUN_AS_NODE=1 npx vitest run` (empty suite) | `npm run dev` opens blank window | Revert `src/`, `vite.config.ts`, `tsconfig*.json`, `package.json` deps |
| WU2 | Shared Zod contracts + typed preload | PR2 | `ELECTRON_RUN_AS_NODE=1 npx vitest run src/shared/contracts` | `npm run dev` (preload loads, channel allowlist logs) | Delete `src/preload/`, `src/shared/contracts/`; preload falls back to v1 IPC |
| WU3a | Migration runner + `001_baseline` | PR3a | `ELECTRON_RUN_AS_NODE=1 npx vitest run src/main/migrations` | `npm run dev` opens with v1 DB (no-op) | Drop `src/main/migrations/`; DB unchanged, v1 binary still works |
| WU3b | `002_rebuild` (new tables/columns) | PR3b | same + v1-fixture upgrade test | `npm run dev` opens with seeded catalog | Drop migration file; pre-migration backup restores |
| WU3c | Repositories + catalog seed | PR3c | repo CRUD tests on temp DB | `npm run dev` lists exams | Remove `repositories/`; no UI breakage |
| WU4 | Auth + role guards + audit writer + idle lock | PR4 | `vitest run services/auth services/audit` | Login screen → idle 5 min → lock | Disable IPC auth handlers; renderer prompts re-login |
| WU5 | Patient module (CRUD, search, soft-delete, masks) | PR5 | `vitest run repositories/patients` | `npm run dev` → Patients tab | Delete `features/patients/`; no clinical flow blocked |
| WU6a | Exam/param/range CRUD + tercerizado flag | PR6a | `vitest run repositories/catalog` | Catalog admin screen lists exams | Revert `features/catalog/`; catalog seed remains |
| WU6b | Reference-ranges pure module + ≥80% tests | PR6b | `vitest run services/referenceRanges --coverage` | Results entry shows sex/age band | Pure module only — revert deletes `referenceRanges.ts` |
| WU7 | Orders + medico + `orden_examenes` + **credit authorization channel** | PR7 | `vitest run repositories/orders services/orders` | Create order w/ credit auth dialog | Revert `features/orders/`; existing orders still readable |
| WU8 | Sampling (register, status, label, reject) | PR8 | `vitest run repositories/samples` | Sampling tab per order | Revert `features/sampling/`; orders still progress |
| WU9a | Result capture + bands + flagging | PR9a | `vitest run services/referenceRanges services/validation` | Capture screen shows correct band | Revert `features/results/` capture only; validation still works |
| WU9b | Validation workflow + **muestras→Resultada side effect** | PR9b | `vitest run services/validation` | Validate → sample status flips | Revert validation handler; capture remains |
| WU10a | Report template + data builder + bundled fonts | PR10a | `vitest run services/pdf` (data only) | Preview window shows WYSIWYG | Revert template; preview falls back to v1 |
| WU10b | Print pipeline (printToPDF + print audit) | PR10b | `vitest run services/pdf` (print audit) | `npm run dev` → print → audit row written | Revert print handler; save-to-file still works |
| WU11a | Payments + abonos + dual currency + **BCV history read** | PR11a | `vitest run services/payments` | Payment dialog records pago móvil | Revert payments IPC; orders still readable |
| WU11b | Cierre de caja + credit deliver-gate | PR11b | `vitest run services/cierre` | Cierre summary + print | Revert cierre; payments still record |
| WU12 | History + 4-view real dashboard | PR12 | `vitest run services/dashboard` | Dashboard shows real KPIs | Revert `features/dashboard/`; history still works |
| WU13 | Config split (lab/bioanalist/users/BCV **+ history table**) | PR13 | `vitest run services/config` | Settings → BCV rate history visible | Revert settings screens; v1 god component stays in git |
| WU14 | Backup / import / export (AES-256-GCM on export, fix Sobrescribir) | PR14 | `vitest run services/backup` | Manual backup to chosen path succeeds | Revert `services/backup/`; DB file copy still works |
| WU15 | NSIS upgrade-safe + electron-rebuild + es-VE locale + smoke | PR15 | `npm run build && npm run package` | NSIS installer upgrades over v1 userData | Revert electron-builder config; v1 installer remains |

---

## Phase 1 — Foundation (WU1 → WU3c)

- [x] 1.1 (WU1) Retarget `package.json` `main` → `dist-electron/main.js`; add deps `zod`, `zustand`, `tailwindcss`, `@tailwindcss/vite`, `vitest`, `bcryptjs`; remove `sqlite3`; add `postinstall: electron-rebuild -f -w better-sqlite3`; `test` script using `ELECTRON_RUN_AS_NODE=1`. Files: `package.json`. ~80 LOC.
- [x] 1.2 (WU1) Rewrite `vite.config.ts` w/ `@tailwindcss/vite`, `vite-plugin-electron` entries `src/main` + `src/preload`; split `tsconfig.app.json` / `tsconfig.node.json` to include `src/shared`. Files: `vite.config.ts`, `tsconfig*.json`. ~120 LOC.
- [x] 1.3 (WU1) Create `src/main/index.ts`, `window.ts`, `src/preload/index.ts` (sandbox + contextIsolation ON), `src/renderer/src/{App.tsx,main.tsx}`, `styles/index.css` w/ `@theme` tokens (warm-neutral + petrol-teal palette, IBM Plex Sans, 8-pt grid, motion tokens honoring `prefers-reduced-motion`), `cn()` util. Files: `src/{main,preload,renderer}/**`, `styles/`. ~300 LOC.
- [x] 1.4 (WU1) Configure Vitest (node env for main, jsdom for renderer), `vitest.config.ts`, coverage ≥80% on clinical modules. Files: `vitest.config.ts`. ~60 LOC.
- [x] 1.5 (WU2) Author Zod 4 schemas per capability in `src/shared/contracts/{auth,patients,catalog,orders,samples,results,payments,config,backup,audit,dashboard}.ts`; `channels.ts` `IpcChannels` map; `errors.ts` envelope + error codes; `constants.ts` roles/states. Files: `src/shared/contracts/*`. ~250 LOC.
- [x] 1.6 (WU2) Typed preload: `contextBridge.exposeInMainWorld('api', {<domain>:<method>})` w/ channel allowlist; validates req + parses res with shared Zod. Files: `src/preload/index.ts`. ~150 LOC.
- [x] 1.7 (WU3a) `src/main/migrations/{runner.ts,001_baseline.sql}`; `schema_version` table; pre-migration backup via `db.backup()`; transactional apply; failure → restore + typed error. RED test: v1-fixture upgrade. Files: `src/main/migrations/*`. ~200 LOC.
- [ ] 1.8 (WU3b) `002_rebuild.sql` adding `orden_examenes`, `pagos`, `cuentas_por_cobrar`, `abonos`, `cierre_caja`, `auditoria`, `medicos_referentes`, `empresas` (placeholder), `muestras`; ALTERs for `examenes_catalogo`, `parametros_examen`, `valores_referencia`, `ordenes`, `resultados`, `usuarios`, `pacientes`; new indexes. Files: `src/main/migrations/002_rebuild.sql`. ~180 LOC.
- [ ] 1.9 (WU3c) `src/main/repositories/{patients,catalog,orders,samples,results,payments,config,backup,audit}.ts` (parameterized SQL, no `any`); port catalog seed. Files: `repositories/*`, `src/main/seed/catalog.ts`. ~280 LOC.

## Phase 2 — Domain Core (WU4 → WU8)

- [ ] 2.1 (WU4) `services/auth.ts` (bcryptjs cost-12, memory session singleton, idle watchdog → `session:locked`), `services/audit.ts` (append-only writer), `ipc/auth.ipc.ts` + `ipc/register.ts` guard wrapper `handle(channel, roles, schema, fn)`. RED: unauthorized role is blocked + audited. Files: `services/{auth,audit}.ts`, `ipc/{auth,register}.ipc.ts`. ~250 LOC.
- [ ] 2.2 (WU4) `useSessionStore` (Zustand 5), Login screen, LockScreen, idle event wiring. Files: `stores/useSessionStore.ts`, `features/auth/{Login,LockScreen}.tsx`. ~150 LOC.
- [ ] 2.3 (WU5) `ipc/patients.ipc.ts` + `features/patients/{List,Form,History,Merge}.tsx`; V-/E- cédula mask, phone mask, soft-delete w/ typed confirm dialog, indexed search (cédula/name/phone), merge w/ conflict preview. RED: duplicate cédula rejected; 50k-row search <100 ms. Files: `ipc/patients.ipc.ts`, `features/patients/*`. ~250 LOC.
- [ ] 2.4 (WU6a) `ipc/catalog.ipc.ts` + `features/catalog/{Exams,Params,Ranges}.tsx`; tercerizado flag + internal provider (D7); qualitative param types; soft-delete. RED: referenced exam soft-deletes. Files: `ipc/catalog.ipc.ts`, `features/catalog/*`. ~280 LOC.
- [ ] 2.5 (WU6b) `services/referenceRanges.ts` pure module: `selectBand(sex, ageUnit, ageDays)` + `computeFlag(value, band, criticos)` + `computeExactAge(dob, refDate)` (days/months/years). RED tests for neonate/infant/adult band selection + out-of-range flag (≥80% cov). Files: `services/referenceRanges.ts`, `services/referenceRanges.test.ts`. ~300 LOC.
- [ ] 2.6 (WU7) `repositories/orders.ts` + `ipc/orders.ipc.ts` + `ipc/medicos.ipc.ts`; `orden_examenes` junction; status workflow Pendiente→Procesando→Completada→Entregada; lock-after-Completada. RED: locked order rejects edit. Files: `repositories/orders.ts`, `ipc/{orders,medicos}.ipc.ts`, `features/orders/*`. ~280 LOC.
- [ ] 2.7 (WU7) **Credit authorization channel** `orders:authorizeCredit(ordenId, monto, motivo)` w/ role guard bioanalista|admin only; sets `ordenes.credito=1`; audit. RED: recepcion blocked + audited. Files: `ipc/orders.ipc.ts` (new handler), `services/orders.ts`. ~100 LOC.
- [ ] 2.8 (WU8) `repositories/samples.ts` + `ipc/samples.ipc.ts` + `features/sampling/{Register,Status,Reject,Label}.tsx`; per-order/exam samples; status Recolectada→En proceso→Resultada (side effect from WU9b); barcode label print (Should). RED: one sample row per exam. Files: `repositories/samples.ts`, `ipc/samples.ipc.ts`, `features/sampling/*`. ~200 LOC.

## Phase 3 — Results & Reporting (WU9 → WU10)

- [ ] 3.1 (WU9a) `ipc/results.ipc.ts` (`results:paramsForCapture` returns parameter + selected band via WU6b + qualitative control type); `results:capture` records value + flag + audit; auto out-of-range flagging. RED: male 35y shows male-adult band only. Files: `ipc/results.ipc.ts`, `features/results/Capture.tsx`. ~300 LOC.
- [ ] 3.2 (WU9b) `services/validation.ts` pure transition table `Pendiente→Capturado→Validado`; bioanalist capture → Validado immediate; tecnico capture → Capturado; `validate`/`reject`/`reopen` (admin override); **Validado transition advances `muestras.estatus → Resultada` (sampling spec scenario)** + audit. RED: tecnico cannot validate; reopen audited. Files: `services/validation.ts`, `ipc/results.ipc.ts`. ~300 LOC.
- [ ] 3.3 (WU10a) `services/pdf.ts` `buildReportData(orderId)` (validated-only filter per D8; config header incl. logo base64; bioanalist signature block; medico referente; patient w/ exact age unit); `report.html` + `report.css` + bundled IBM Plex Sans; `break-inside: avoid`; `@page A4`. RED: validated-only filter excludes Capturado. Files: `services/pdf.ts`, `report.{html,css}`, `assets/fonts/`. ~280 LOC.
- [ ] 3.4 (WU10b) Offscreen window `sandbox:true, contextIsolation:true, webSecurity:true` (NO `webSecurity:false`); `loadFile(template)`; `await executeJavaScript("document.fonts.ready.then(()=>true)")`; `printToPDF({pageSize:'A4', printBackground:true})`; `webContents.print()`; audit `reporte.impreso`. RED: print audit row written. Files: `services/pdf.ts` (print fn). ~250 LOC.

## Phase 4 — Payments & Insights (WU11 → WU12)

- [ ] 4.1 (WU11a) `services/payments.ts` pure: methods (pago_movil|transferencia|punto|efectivo|mixto), Bs/USD + BCV, abonos balance, **delivery-block gate honoring `ordenes.credito=1` (WU7 authorization)**, missing-rate blocks USD. RED: 400 Bs on 1000 Bs order → 600 Bs balance. Files: `services/payments.ts`. ~280 LOC.
- [ ] 4.2 (WU11a) `ipc/payments.ipc.ts` (`payments:record`, `:cancel`, `:listForOrder`, `:balance`, `config:getBcvRate`, `config:setBcvRate`); `features/payments/{Record,List}.tsx`; **BCV rate read channel reads from history (WU13) not just current**. RED: USD payment converts using active rate from history; missing rate blocks. Files: `ipc/payments.ipc.ts`, `features/payments/*`. ~250 LOC.
- [ ] 4.3 (WU11b) `services/cierre.ts` consolidates deposit + delivery moments by method with Bs/USD totals; `cierre:run` + `cierre:print` channels; rate last-updated date surfaced. RED: cierre summary totals match individual payments. Files: `services/cierre.ts`, `ipc/payments.ipc.ts` (cierre handlers), `features/cierre/*`. ~280 LOC.
- [ ] 4.4 (WU12) `services/dashboard.ts` real aggregates (`dashboard:today`, `:debtors` w/ aging 0-30/31-60/61-90/90+, `:stats` top exams + monthly revenue vs prev, `:trends` per-patient analyte); `ipc/dashboard.ipc.ts`; `features/history/*` (filters date/patient/status/payment + re-print/re-export); `features/dashboard/*` 4-view tabs w/ empty states; recharts wired to real data (Should). RED: KPIs match hand-rolled SQL on seeded DB. Files: `services/dashboard.ts`, `ipc/dashboard.ipc.ts`, `features/{history,dashboard}/*`. ~400 LOC.

## Phase 5 — Config, Backup & Polish (WU13 → WU15)

- [ ] 5.1 (WU13) `ipc/config.ipc.ts` + `features/settings/{Lab,Bioanalist,Billing,Users,Backup}.tsx` (split god component per M13.3); logo asset upload (base64 data URI, N11.3); **BCV rate history table** (`bcv_historial`) w/ INSERT on rate change, last-updated surfaced; merge Sobrescribir fix (M13.5, deletes-then-inserts under transaction). RED: history row inserted on rate change; Sobrescribir overwrites without UNIQUE error. Files: `ipc/config.ipc.ts`, `features/settings/*`, `migrations/002_rebuild.sql` (add `bcv_historial`). ~400 LOC.
- [ ] 5.2 (WU13) `ipc/users.ipc.ts` admin-only CRUD w/ bcrypt hashing + debe_cambiar_clave; `users:disable` + `users:resetPassword`; bootstrap admin seed on first migration. RED: non-admin blocked. Files: `ipc/users.ipc.ts`, `features/settings/Users.tsx`. ~150 LOC.
- [ ] 5.3 (WU14) `services/backup.ts` (`backup:create` better-sqlite3 `.backup()` to user-chosen path, `backup:list`, `backup:restore` w/ schema_version validate + preventive backup + `app.relaunch()`); `import:preview` + `import:apply` w/ conflict preview (skip/overwrite/keep-both); `export:filtered` CSV/JSON w/ AES-256-GCM passphrase encryption on external export only (A9); audit. RED: incompatible schema_version rejected; AES round-trip. Files: `services/backup.ts`, `ipc/backup.ipc.ts`, `features/backup/*`. ~350 LOC.
- [ ] 5.4 (WU15) `package.json` `postinstall: electron-rebuild`; electron-builder `nsis` config: stable `productName=LabCore`, `appId=com.labcore.app`, no `deleteAppDataOnUninstall`; documented pre-upgrade backup step in README; es-VE locale pass (`Intl.DateTimeFormat('es-VE')`, `dd/mm/yyyy`, Bs formatting, V-/E- cédula, `i18n/es-ve.ts` dictionary, technical artifacts English); a11y pass (labels, focus, AA contrast on tables); final `npm run build` + `npm run package` smoke checklist (upgrade-install over v1 userData, NSIS preserves `%APPDATA%/LabCore`). Files: `package.json`, `electron-builder.yml`, `README.md`, `src/renderer/src/i18n/es-ve.ts`. ~250 LOC.

---

## Result Contract

- **status**: ok
- **executive_summary**: 78 implementation tasks across 22 work-unit slices (15 base + 6 design sub-slices + WU6 split). Forecast High-risk; chained PRs recommended; ask-on-risk decision required before apply.
- **artifacts**: `openspec/changes/labcore-pro-rebuild/tasks.md`
- **next_recommended**: ask the user for chain strategy (stacked-to-main / feature-branch-chain / size:exception) before launching `sdd-apply`
- **risks**:
  - WU4 / WU6 / WU12 / WU13 may exceed 400 changed-line budget even with sub-slicing → chained PRs are required, not optional.
  - WU1 install + configure Vitest is a hard prerequisite for any test-bearing task (no runner today).
  - Production DB migration (WU3a/3b) is additive-only with pre-migration backup, but MUST be tested on a prod-DB copy inside Electron before merge.
  - better-sqlite3 ABI gotcha: any test/seed script must run under `ELECTRON_RUN_AS_NODE=1` (design A5) — system-Node v24 will throw `ERR_DLOPEN_FAILED`.
  - Strict TDD is OFF; RED-GREEN is applied only to clinical modules (WU6b reference-ranges, WU9b validation, WU11a payments) per design §Testing Strategy.
- **skill_resolution**: paths-injected (`sdd-tasks`, `work-unit-commits`, `chained-pr`)
