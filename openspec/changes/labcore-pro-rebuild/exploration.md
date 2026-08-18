# Exploration — labcore-pro-rebuild

> Change: **labcore-pro-rebuild** · Project: LabCore (aplicacion-para-laboratorio-clinico)
> Phase: sdd-explore · Store: openspec · Language: English
> Date: 2026-08-18

## Current State

LabCore is a single-user, offline-first **desktop** application for ONE Venezuelan
clinical laboratory. Stack: Electron 33 + Vite 7 + React 19.2 + TypeScript 5.9 +
better-sqlite3 (WAL, foreign_keys ON), packaged with electron-builder (NSIS).

Process layout (v1):
- `electron/` — main process: `main.ts`, `preload.ts`, `database.ts`,
  `ipcHandlers.ts`, `mergeService.ts`, `pdfTemplate.ts`, `systemServices.ts`
- `src/` — renderer (React): 8 module components (`DashboardModule`,
  `HistoryModule`, `OrderModule`, `PatientForm`, `PatientModule`,
  `PaymentModule`, `ResultEntryModule`, `SettingsModule`), `hooks/useMask.ts`,
  `App.tsx`, `main.tsx`, `index.css`
- `lab_clinical.db` — 77,824 bytes (~78 KB) at repo root in dev; `userData` in prod.
  Contains the seeded Venezuelan exam catalog (hematology, chemistry, urinalysis,
  serology, hormones) with parameters and reference ranges.

**What works in v1 (salvageable):**
- DB schema as a **domain blueprint**: `pacientes`, `examenes_catalogo`,
  `parametros_examen`, `valores_referencia` (sex/age-scoped), `ordenes`,
  `resultados`, `configuracion` (key-value), `usuarios` (defined but UNUSED).
- Electron + better-sqlite3 concept with WAL + foreign keys + pragmatic config seeding.
- Context isolation is done correctly (preload + contextBridge).
- Backup / export-full / import-with-merge feature set (the *intent*, not the impl).
- Seeded Venezuelan exam catalog with reference ranges.

**What is broken / missing in v1 (verified directly, not just from the orchestrator):**
1. **PDF engine broken** (`pdfTemplate.ts:14`, `systemServices.ts`): logo HARDCODED
   to a machine-specific Antigravity temp path; bioanalyst creds partially hardcoded
   in the signature footer (line 204 ignores the `prof_creds` config variable that
   *is* defined on line 11); single-exam PDFs only; no pagination; offscreen
   `BrowserWindow` with `webSecurity:false`; `data:` URL load; 500 ms fixed font race.
2. **Dashboard is 100% fabricated** — hardcoded 2023 constants, no real queries.
3. **OrderModule is a dead end** — persists nothing, advertises a nonexistent Alt+N shortcut.
4. **~40 Tailwind utility classes resolve to NOTHING** — clsx + tailwind-merge are
   installed but there is NO Tailwind/PostCSS config (confirmed: no `tailwind*` /
   `postcss*` files). Only ~12 real classes exist in `index.css`. Grids collapse,
   animations are inert, the merge-conflict modal is unstyled.
5. **Clinical risk — wrong reference ranges at ENTRY**: `db:getParams` (ipcHandlers.ts:242)
   does `LEFT JOIN valores_referencia ... GROUP BY p.id` with **no sex/age filter** in
   the WHERE clause, so the bioanalist sees an arbitrary reference row while capturing
   results. NOTE the nuance: the *PDF* path (`db:getOrderReport`) **does** filter by
   sex and age — so the defect is specifically at result-entry time, not report time.
6. **No auth anywhere**: `usuarios` table exists but is unused; zero login/session
   handlers. Anyone can edit finalized results and hard-delete patients. `system:wipeData`
   deletes ALL patients/orders/results with no audit and no confirmation beyond a native `confirm`.
7. **Payments = boolean flip**: `updatePaymentStatus` sets `estatus_pago` to
   `Pendiente`/`Pagado` only. No method (pago móvil/transferencia/punto/efectivo),
   no Bs/USD dual currency, no BCV rate, no reference number, no partial payments,
   no daily cash close (cierre de caja).
8. **SettingsModule = 856-line god component** spanning 5 domains; the "Sobrescribir"
   merge path is broken (UNIQUE constraint collision).
9. **Dead code**: `system:importData`, `system:backup` handlers; `mergeService` path;
   dual sqlite deps (`better-sqlite3 ^12.5` AND `sqlite3 ^5.1.7`) — only better-sqlite3 is live.
10. **Type-safety void**: `any` across the entire IPC trust boundary; ID type chaos
    (string vs number — `updatePaymentStatus` does `parseInt(String(orderId))` while
    others pass ids raw); native `alert`/`confirm`/`prompt` for destructive clinical ops.

**ABI gotcha (hard constraint for all phases):** better-sqlite3 is compiled against
Electron's Node (NODE_MODULE_VERSION 130); system Node is v24 (137). Any Node CLI
script that opens `lab_clinical.db` outside Electron fails with `ERR_DLOPEN_FAILED`.
Migration/maintenance tooling MUST run inside Electron (or rebuild first).

## Affected Areas

- `electron/database.ts` — schema + seeding; becomes the v1-baseline migration source.
- `electron/ipcHandlers.ts` — entire trust boundary; rebuilt with typed Zod-validated handlers + role guards.
- `electron/pdfTemplate.ts` + `electron/systemServices.ts` — PDF engine; redesigned.
- `electron/mergeService.ts` — dead/broken; replaced by a real import/export service.
- `electron/preload.ts` — typed preload API (channel allowlist + discriminated types).
- `electron/main.ts` — window/menu/auto-update/migration-runner bootstrap.
- `src/components/*.tsx` — all 8 modules rebuilt; SettingsModule split into ≤5 components.
- `src/index.css` + missing Tailwind/PostCSS config — styling foundation.
- `package.json` — remove `sqlite3`, add Vitest + Tailwind 4 + Zustand + Zod 4.
- `lab_clinical.db` (dev) and the production DB at the lab — migration targets, data MUST survive.

---

## Functional Requirements Catalog

Priority: **M** = Must for v2.0 · **S** = Should for v2.0 · **C** = Could (post-2.0).
v1 status: **EB** = exists-broken · **EW** = exists-works · **MI** = missing.

### M1 — Auth & Roles
| FR | Requirement | Pri | v1 |
|---|---|---|---|
| M1.1 | Login with username + password (bcrypt/argon2 hash; no plaintext) | M | EB (table only) |
| M1.2 | Roles: admin, bioanalista, tecnico, recepcion with permission matrix | M | EB (table only) |
| M1.3 | Session persists for app lifetime; lock-screen on idle timeout | M | MI |
| M1.4 | User management CRUD (admin only): create/disable/reset users | M | MI |
| M1.5 | Change own password | S | MI |
| M1.6 | Failed-login attempt throttling (offline, local) | S | MI |

### M2 — Patients
| FR | Requirement | Pri | v1 |
|---|---|---|---|
| M2.1 | Patient CRUD with cédula (V- format), names, DOB, sex (M/F/O), phone, email, address | M | EW |
| M2.2 | Cédula uniqueness + format validation | M | EW |
| M2.3 | Search by cédula / name / phone (instant, indexed) | M | EB (no search) |
| M2.4 | Soft-delete (deactivate) instead of hard-delete; audit the action | M | EB (hard delete) |
| M2.5 | Patient history view (all prior orders + results) | M | EB |
| M2.6 | Merge duplicate patients (by cédula) with conflict resolution | S | EB (broken) |

### M3 — Exam Catalog
| FR | Requirement | Pri | v1 |
|---|---|---|---|
| M3.1 | Exam CRUD: code, name, category, sample type, price, active flag | M | EW |
| M3.2 | Parameter CRUD per exam: name, order, unit | M | EW |
| M3.3 | Reference-range CRUD per parameter: sex-scoped (M/F/Ambos), age range, min/max, interpretation | M | EW |
| M3.4 | Qualitative/categorical results (e.g. Reactivo/No Reactivo, Positivo/Negativo, trace/1+/2+/3+) | M | MI |
| M3.5 | Soft-delete exams/params (active flag); never hard-delete referenced rows | M | EB (soft on exam only) |
| M3.6 | Import/export catalog as JSON/CSV | S | MI |

### M4 — Reference Ranges (clinical-critical)
| FR | Requirement | Pri | v1 |
|---|---|---|---|
| M4.1 | Pediatric ranges in **months** (0–24 mo) AND years — age-unit-aware selection | M | MI (years only) |
| M4.2 | Sex-aware range selection at **result-entry time** (the v1 clinical bug) | M | EB |
| M4.3 | Age computed exactly from DOB (years + months) at entry and report | M | EB |
| M4.4 | Out-of-range flagging (low/high/critical) shown to bioanalist during entry | M | MI |
| M4.5 | Multiple reference bands per parameter (e.g. neonate, infant, adult, elderly) | M | EW |
| M4.6 | Qualitative result interpretation text per band | S | EB (single interpretacion) |

### M5 — Orders
| FR | Requirement | Pri | v1 |
|---|---|---|---|
| M5.1 | Create order: patient + one-or-more exams + medico referente + empresa/price list | M | EB (no exam list persisted) |
| M5.2 | Order status workflow: Pendiente → Procesando → Completada → Entregada | M | EW (status enum) |
| M5.3 | `orden_examenes` junction (persist which exams belong to an order) | M | MI (inferred from results) |
| M5.4 | Order total computed from exam prices × empresa price list | M | EB |
| M5.5 | Edit order before completion; lock after finalization | M | MI |
| M5.6 | Order observations / clinical notes | M | EW |
| M5.7 | Cancel/void order with reason + audit | S | MI |

### M6 — Sampling
| FR | Requirement | Pri | v1 |
|---|---|---|---|
| M6.1 | Sample registration per order/exam (sample type from catalog) | M | MI |
| M6.2 | Sample status: Recolectada → En proceso → Resultada | M | MI |
| M6.3 | Sample ID / barcode label generation + print | S | MI |
| M6.4 | Reject sample with reason (hemólisis, coágulo, volumen insuficiente) | S | MI |

### M7 — Result Capture & Validation Workflow
| FR | Requirement | Pri | v1 |
|---|---|---|---|
| M7.1 | Capture results per parameter (numeric or qualitative) with sex/age-correct ref ranges shown | M | EB (clinical risk) |
| M7.2 | Validation workflow: Borrador → Validado → Rechazado; validated_by + validated_at | M | MI |
| M7.3 | Only bioanalista/admin can validate (role guard) | M | MI |
| M7.4 | Reject-and-rework with reason; audit each transition | M | MI |
| M7.5 | Finalized results are immutable unless re-opened with admin override + audit | M | MI |
| M7.6 | Flag out-of-range / critical values automatically | M | MI |
| M7.7 | General observation per order + per-exam comments | S | EB (order-only) |

### M8 — PDF Reporting Engine
| FR | Requirement | Pri | v1 |
|---|---|---|---|
| M8.1 | Generic multi-exam report (one PDF, multiple exams grouped) | M | EB (single-exam) |
| M8.2 | Pagination for long results | M | MI |
| M8.3 | Logo + lab header + bioanalist creds + sede all driven from config (no hardcoded paths/creds) | M | EB |
| M8.4 | Patient header (name, cédula, sex, exact age, date) | M | EW |
| M8.5 | Results table: análisis, resultado, unidad, referencia, out-of-range flag | M | EW |
| M8.6 | Print to OS printer (not just save-to-file) + print-preview | M | MI |
| M8.7 | Report copy/duplicate with "COPIA" watermark | S | MI |
| M8.8 | Report access audit (who printed, when) | M | MI |

### M9 — Payments (Venezuela) & Cierre de Caja
| FR | Requirement | Pri | v1 |
|---|---|---|---|
| M9.1 | Payment methods: pago móvil, transferencia, punto, efectivo, mixto | M | MI |
| M9.2 | Dual currency Bs / USD with manual BCV rate entry (offline) | M | MI |
| M9.3 | Payment reference number + date + cashier (usuario) | M | MI |
| M9.4 | Partial payments; track balance due | M | MI |
| M9.5 | Cierre de caja: daily summary by method, Bs+USD totals, print | M | MI |
| M9.6 | Payment audit (every payment + every cancellation/refund) | M | MI |
| M9.7 | Link payment(s) to order; order not "Entregada" until settled or flagged | S | EB |

### M10 — History / Timeline
| FR | Requirement | Pri | v1 |
|---|---|---|---|
| M10.1 | Global history of orders (patient, cédula, date, status, exams, total, payment) | M | EW |
| M10.2 | Filter by date range / patient / status / payment | M | EB (no filters) |
| M10.3 | Re-open / re-print / re-export any past order | M | EB (print only) |
| M10.4 | Patient-specific timeline | S | EB |

### M11 — Dashboard / Analytics (REAL data)
| FR | Requirement | Pri | v1 |
|---|---|---|---|
| M11.1 | KPIs from real DB queries: orders today, revenue today (Bs+USD), pending results, exams by category | M | EB (fabricated) |
| M11.2 | Charts (recharts already installed): revenue trend, exam volume, top exams | S | EB (fabricated) |
| M11.3 | Date-range selector; all numbers reflect real data only | M | EB (fabricated) |
| M11.4 | No fabricated/fallback numbers ever — empty state when no data | M | EB |

### M12 — Audit Log
| FR | Requirement | Pri | v1 |
|---|---|---|---|
| M12.1 | Append-only audit_log: actor (usuario), action, entity, entity_id, before/after JSON, timestamp | M | MI |
| M12.2 | Audit on: patient create/edit/delete, order create/edit/cancel, result validate/reject/reopen, payment, config change, user mgmt, print, export/import | M | MI |
| M12.3 | Audit viewer (admin) with filters | M | MI |
| M12.4 | Audit log is immutable (no UPDATE/DELETE on rows) | M | MI |

### M13 — Configuration
| FR | Requirement | Pri | v1 |
|---|---|---|---|
| M13.1 | Lab config: name, address, sedes, logo (asset, not FS path), bioanalist name/title/creds (MSDS/CBZ) | M | EW |
| M13.2 | BCV rate entry + history | M | MI |
| M13.3 | Split SettingsModule into focused sub-screens (lab, bioanalist, billing, users, backup) | M | EB (god component) |
| M13.4 | Print defaults (page size, margins, copies) | S | MI |
| M13.5 | Fix merge "Sobrescribir" path (UNIQUE constraint) | M | EB |

### M14 — Backup / Import / Export
| FR | Requirement | Pri | v1 |
|---|---|---|---|
| M14.1 | Manual full backup (SQLite file copy to user-chosen path) | M | EW |
| M14.2 | Automatic periodic backup to userData/backups (retention policy) | S | EB (manual only) |
| M14.3 | Restore (replace) with preventive backup + relaunch | M | EW |
| M14.4 | Import/merge with conflict preview (patients + catalog) | M | EB (broken merge) |
| M14.5 | Export filtered dataset (date range) as CSV/JSON | S | MI |
| M14.6 | Remove dead handlers (`system:importData`, `system:backup` unused) | M | EB |

### M15 — Print Queue
| FR | Requirement | Pri | v1 |
|---|---|---|---|
| M15.1 | Queue reports for batch printing (e.g. end-of-day delivery) | S | MI |
| M15.2 | Print status per item (pending/printed/error) + retry | S | MI |
| M15.3 | Reprint from queue with audit | S | MI |

### M16 — Médico Referente
| FR | Requirement | Pri | v1 |
|---|---|---|---|
| M16.1 | Referring-doctor CRUD: name, cédula, specialty, phone | M | MI |
| M16.2 | Select medico on order; show on report | M | MI |
| M16.3 | Stats per medico (referrals, revenue) | C | MI |

### M17 — Insurers / Empresas + Price Lists
| FR | Requirement | Pri | v1 |
|---|---|---|---|
| M17.1 | Empresa/aseguradora CRUD: name, RIF, contact, default price-list | S | MI |
| M17.2 | Price lists: base price + % surcharge/discount per empresa | S | MI |
| M17.3 | Assign empresa to order; price computed from its list | S | MI |
| M17.4 | Empresa billing summary (receivables) | C | MI |

**FR totals: 17 modules · 84 requirements** — 60 Must, 18 Should, 6 Could.
v1 status spread: ~22 exists-works, ~30 exists-broken, ~32 missing.

---

## Non-Functional Requirements Catalog

### N1 — Offline-First
| NFR | Requirement | Pri |
|---|---|---|
| N1.1 | 100% offline operation; zero network dependency at runtime | M |
| N1.2 | All data local (better-sqlite3 in userData); no telemetry/home-calls | M |
| N1.3 | BCV rate entered manually (no live fetch) | M |

### N2 — Health-Data Security
| NFR | Requirement | Pri |
|---|---|---|
| N2.1 | Passwords hashed (bcrypt/argon2), never plaintext or reversible | M |
| N2.2 | DB at-rest protection: app-level encryption of backups; DB file in userData (OS user-scoped) | M |
| N2.3 | Role-based access on every IPC handler (main-process guard) | M |
| N2.4 | Append-only audit log; tamper-evident (row hash chain optional) | S |
| N2.5 | Context isolation + sandbox ON; no `webSecurity:false`; no `nodeIntegration` | M |
| N2.6 | No native `alert/confirm/prompt` for destructive ops; typed confirm dialogs | M |

### N3 — Data Integrity & Migrations
| NFR | Requirement | Pri |
|---|---|---|
| N3.1 | Migration runner with `schema_version` table; numbered, transactional SQL migrations | M |
| N3.2 | First migration = v1 baseline (captured from current schema); later migrations evolve it | M |
| N3.3 | Existing production DB upgrades in place with ZERO data loss | M |
| N3.4 | FK constraints + WAL preserved; cascade rules explicit | M |
| N3.5 | Pre-migration automatic backup; rollback on migration failure | M |

### N4 — Backup Strategy
| NFR | Requirement | Pri |
|---|---|---|
| N4.1 | Manual + automatic backups (file copy + SQLite `.backup()`) | M |
| N4.2 | Retention: keep last N backups (configurable), prune older | S |
| N4.3 | Backups exportable to removable media / user path | M |
| N4.4 | Restore validates schema_version before replacing | M |

### N5 — Performance
| NFR | Requirement | Pri |
|---|---|---|
| N5.1 | Patient search < 100 ms for ≤50k rows (indexed cédula/name) | M |
| N5.2 | PDF generation < 3 s for a 5-exam report | M |
| N5.3 | App cold start < 3 s on lab hardware (typical office PC) | S |
| N5.4 | DB queries use indexes; EXPLAIN-reviewed hot paths | M |
| N5.5 | No blocking the renderer on long queries (IPC is already async) | M |

### N6 — Testability
| NFR | Requirement | Pri |
|---|---|---|
| N6.1 | Vitest installed (node env for main/contracts, jsdom for renderer) | M |
| N6.2 | Unit tests for clinical-critical logic: ref-range selection, age calc, payment math, migrations | M |
| N6.3 | Contract tests: every Zod schema round-trips through IPC | M |
| N6.4 | Coverage gate on the clinical-safety modules (≥80%) | S |
| N6.5 | Strict TDD enabled for new clinical logic (RED-GREEN-REFACTOR) | S |

### N7 — Packaging & Auto-Update
| NFR | Requirement | Pri |
|---|---|---|
| N7.1 | NSIS installer (per-machine or per-user) with desktop + start-menu shortcuts | M |
| N7.2 | Code signing (optional for v2.0; flagged) | C |
| N7.3 | electron-updater for offline-distributable updates (USB/local file update channel) | S |
| N7.4 | better-sqlite3 rebuilt for Electron in the packaged build (postinstall / electron-rebuild) | M |
| N7.5 | App icon (`public/icon.ico`) present and correct | M |

### N8 — Usability (non-technical lab staff)
| NFR | Requirement | Pri |
|---|---|---|
| N8.1 | Keyboard-first data entry; Tab order; Enter-to-save on forms | M |
| N8.2 | Cédula/phone masks (useMask.ts exists — formalize) | M |
| N8.3 | Clear confirmations for destructive actions; undo where feasible | M |
| N8.4 | Status always visible (order status, validation state, payment state) | M |
| N8.5 | Error messages in plain Spanish, never raw stack traces to the user | M |

### N9 — Locale (es-VE)
| NFR | Requirement | Pri |
|---|---|---|
| N9.1 | All UI strings in Venezuelan Spanish (es-VE) | M |
| N9.2 | Dates `dd/mm/yyyy`, currency Bs. with correct separators | M |
| N9.3 | Cédula V-/E- prefix; RIF format for empresas | M |
| N9.4 | Technical artifacts (code, SDD files) remain English | M |

### N10 — Accessibility
| NFR | Requirement | Pri |
|---|---|---|
| N10.1 | Semantic HTML; labels on every input; focus visible | M |
| N10.2 | Sufficient color contrast (WCAG AA) for the data-dense tables | S |
| N10.3 | Screen-reader-friendly table headers | S |
| N10.4 | prefers-reduced-motion respected (desktop animations minimal anyway) | C |

### N11 — Print Fidelity
| NFR | Requirement | Pri |
|---|---|---|
| N11.1 | Printed report matches on-screen preview (WYSIWYG) | M |
| N11.2 | A4 page; consistent margins; no content cut off (pagination) | M |
| N11.3 | Logo renders from bundled asset (no missing-image on other machines) | M |
| N11.4 | Fonts loaded deterministically (no 500 ms race) | M |

**NFR totals: 11 categories · 45 requirements** — 34 Must, 8 Should, 3 Could.

---

## Architecture Approaches

### Option A — Refactor-in-place (keep `electron/` main, fix file-by-file)
Keep the current `electron/` + `src/` tree; rewrite each module in place against the
new contracts, fix the PDF engine, add Tailwind config, layer in auth/migrations.
- **Pros:** smallest diff to tooling; existing build pipeline untouched; can ship fixes incrementally.
- **Cons:** the rot is structural (god component, dead handlers, `any` everywhere, fabricated dashboard, dual sqlite dep, broken merge) — fixing in place drags the old shape forward; high risk of leaving dead paths; reviewers see diffs polluted with the old structure; the "v1 as reference only" product decision is violated in spirit.
- **Effort:** Medium-High (constant friction against the old shape).

### Option B — Clean-slate `src/electron` inside the SAME repo, reusing the v1 schema as blueprint
New code lives under a clean layout (`src/main`, `src/preload`, `src/renderer`,
`src/shared`). v1 (`electron/`, current `src/`) stays in git history (baseline commit)
as READ-ONLY reference — not built, not shipped. The new DB layer captures the v1
schema as migration `001_baseline` so the production DB upgrades in place. Package.json
points `main` at the new entry; the old `electron/` is removed from `files`.
- **Pros:** matches the user's FINAL product decision exactly; lets the team build the typed IPC + Zod contracts + migration runner + design system correctly from day one; no dead code carried; reviewable per-work-unit diffs that aren't fighting old structure; the salvaged schema/catalog/config seeding survive via the baseline migration.
- **Cons:** larger initial scaffolding work-unit; must re-implement the working pieces (patient CRUD, catalog seeding) — though most is mechanical porting against the same schema; short-term two code paths exist in git (mitigated: old is reference-only, not built).
- **Effort:** Medium (most logic is a straight port; the hard parts — PDF, payments, validation workflow — are net-new in both options).

### Option C — Strangler hybrid (new shell + gradually port modules behind a router)
Ship a new shell with one or two modules; keep v1 modules reachable via a legacy
bridge until each is ported; remove legacy as ports land.
- **Pros:** fastest path to *something* running; de-risks the rebuild.
- **Cons:** requires a legacy-bridge layer (dual IPC, dual DB access, dual styling) that is pure overhead and itself a source of bugs; for a SINGLE-user desktop app there is no rollout audience to strangulate toward — the lab runs one binary. The bridge complexity is not justified here.
- **Effort:** High (bridge maintenance dominates).

### Recommendation: **Option B — Clean-slate in the same repo, v1 schema as baseline migration.**

Rationale: The product decision is already FINAL ("rebuild as desktop pro", "v1 stays in
git history as reference only"). Option B honors it, gives a clean typed boundary from
the start, and the salvaged value (schema, catalog, config seeding) is preserved through
the migration runner rather than by keeping old code live. Option A would continuously
fight the structural rot; Option C's strangler is designed for multi-tenant rollouts, not
a single desktop binary. The extra scaffolding in B is a one-time cost that pays back in
every subsequent review.

### Sub-decisions (resolved for the design phase)

**Styling — Tailwind 4 + design tokens (hybrid).**
Configure Tailwind 4 properly via `@tailwindcss/vite` (v4 needs no PostCSS config),
consuming a token layer (CSS custom properties for color/spacing/radius/typography
scales, per the `design-system-tokens` skill) through Tailwind's theme. This makes the
~40 currently-dead utility classes actually resolve AND establishes a token-driven
design system. Keep the installed `clsx` + `tailwind-merge` (now used for real via a
`cn()` helper). Use CSS Modules only for the few complex components (PDF preview,
data-dense tables) where scoped styles beat utilities. This directly kills the
"classes resolve to nothing" defect and the AI-slop risk.

**State management — Zustand 5 for cross-cutting client state + custom `useIpcQuery` hook.**
Zustand for: auth session, cached lab config, toast/notification queue. A thin custom
`useIpcQuery`/`useIpcMutation` hook (no heavy dependency) for IPC data fetching with
simple cache + manual invalidation. TanStack Query is nice but unjustified for an
offline single-user app. Pure Context is rejected (re-render + boilerplate cost).

**Shared Zod contracts across IPC — `src/shared/contracts/`.**
Zod 4 schemas for every IPC payload (Patient, Exam, Order, Result, Payment, Config,
User, etc.). Validate on BOTH sides: renderer validates before `invoke`, main
validates on receive. Derive TS types via `z.infer`. This eliminates the `any`
trust boundary and the ID-type chaos (schemas coerce/validate ids consistently to
`number`). Per the `zod-4` skill (Zod 4 breaking changes: `z.email()`, `error` param,
etc.).

**Typed preload API.**
Per the `electron` skill Pattern 2/3: a discriminated `IpcChannels` map (channel →
{request, response}), `contextBridge.exposeInMainWorld` exposing only typed
`invoke`/`send`/`on` with a channel allowlist. `window.api` is fully typed in the
renderer. No raw `ipcRenderer` exposure.

**Vitest adoption — YES, Must for v2.0.**
A clinical app cannot ship with zero tests on reference-range selection (the exact
bug v1 has). Add Vitest (node env for main/contracts/migrations, jsdom for renderer).
Strict TDD stays OFF globally (per config) but is applied RED-GREEN to the
clinical-critical modules: ref-range selection, age calc, payment math, migrations,
Zod contracts. Coverage gate ≥80% on those modules.

**DB migration strategy from v1 — numbered migrations + v1 baseline.**
Add a `schema_version` table and a migration runner that runs on app start inside
Electron (respecting the ABI gotcha — never via system Node). Migration `001_baseline`
captures the current v1 schema verbatim (so an existing v1 production DB is recognized
and needs no change). Migration `002_rebuild` adds the missing tables/columns:
`orden_examenes` (junction), `pagos` + `pagos_detalle`, `cierre_caja`,
`medico_referente`, `empresas`, `listas_precios`, `audit_log`, `muestras`, plus
`resultados` validation-workflow columns (`estatus_validacion`, `validado_por`,
`validado_en`, `tipo_resultado` numeric/qualitative) and `valores_referencia`
age-unit support (`edad_unidad` months/years). Each migration is transactional and
preceded by an automatic backup. The ~78 KB dev DB (seeded catalog) and the production
DB both upgrade in place with zero data loss.

**PDF engine — Electron `printToPDF` with a redesigned generic multi-exam template.**
Keep Electron-native printing (no extra Chromium like Puppeteer, no manual PDFKit
layout). Redesign: render the report from a dedicated report component/template that
groups resultados by exam, supports pagination (`@page` + CSS page breaks), pulls
logo from a bundled asset as a base64 data URI (never a filesystem path), and all
bioanalist/cred/sede data from config. Load in a hidden `BrowserWindow` with
`contextIsolation:true`, `sandbox:true`, `webSecurity:true`; wait for fonts via a
proper `did-finish-load` + `document.fonts.ready` IPC handshake (no fixed 500 ms
timeout). Support both save-to-file and print-to-printer (`webContents.print`).

**Anti-AI-slop — design tokens + a real design system.**
A clinical desktop UI must read as a professional tool, not a templated marketing
page. Establish a token layer (color scale, type scale, 8-pt spacing, elevation,
radius, z-index) consumed by Tailwind theme + components. Build a small component
library (Button, Input, Select, DataTable, Modal, Badge, Toast, StatusPill) with
consistent variants — not ad-hoc per-module styling. Calm, high-contrast, data-dense,
low-animation. This is where the `frontend-design` + `design-system-tokens` +
`solid-clean-code` skills apply.

---

## Recommended Scope Slicing (work units ≤ ~400 changed lines each)

The session review budget is **400 changed lines per work unit**. The rebuild is
large, so it is sliced into reviewable work units. Each WU is independently shippable
and reviewable. WUs marked ⚠ risk exceeding 400 lines and are sub-sliced.

| # | Work Unit | Scope | Risk |
|---|---|---|---|
| WU1 | **Scaffold & tooling** | New `src/main`,`src/preload`,`src/renderer`,`src/shared` layout; `main` retarget; remove `sqlite3` dep; add Vitest + Tailwind 4 + Zustand + Zod 4; tsconfig split; `cn()` helper; token layer skeleton; blank app boots | Low |
| WU2 | **Contracts + typed preload API** | `src/shared/contracts/*` Zod schemas + `z.infer` types; `IpcChannels` map; typed `contextBridge` API; channel allowlist | Low |
| WU3 | **DB layer + migration runner** | `schema_version` + runner; `001_baseline` (v1 schema verbatim); `002_rebuild` (new tables/columns); typed repository module (no `any`); catalog seeding ported | ⚠ sub-slice: 3a runner+baseline, 3b migration 002, 3c repository+seed |
| WU4 | **Auth/roles + audit writer** | Login (bcrypt), session store (Zustand), role matrix, IPC role guards, `audit_log` writer helper, lock-screen idle | Med |
| WU5 | **Patient module** | CRUD + soft-delete + search + cédula mask + history view + merge (fixed) | Low |
| WU6 | **Exam catalog + reference ranges** | Exam/param/ref-range CRUD; pediatric-in-months; qualitative bands; sex/age-aware | Med |
| WU7 | **Orders + medico referente** | Order create with exam list + medico + empresa/price list; status workflow; lock-after-finalize | Med |
| WU8 | **Sampling** | Sample registration + status + barcode label + reject-with-reason | Low |
| WU9 | **Result capture + validation workflow** | Sex/age-correct ref ranges at entry; out-of-range flagging; validate/reject/reopen; role guard; audit | ⚠ sub-slice: 9a capture+ref-ranges, 9b validation workflow |
| WU10 | **PDF reporting engine** | Generic multi-exam template; pagination; config-driven logo/creds; proper font handshake; print-to-printer + preview; print audit | ⚠ sub-slice: 10a template+data, 10b print pipeline |
| WU11 | **Payments VE + cierre de caja** | Methods; Bs/USD + BCV rate; reference; partials; daily close + print; payment audit | ⚠ sub-slice: 11a payments, 11b cierre de caja |
| WU12 | **History + dashboard (real data)** | History with filters; real KPI queries; recharts wired to real data; empty states | Low |
| WU13 | **Config module (split)** | Split the 856-line god component into focused screens; fix merge Sobrescribir; logo asset upload | Med |
| WU14 | **Backup/import/export (rewrite)** | Manual+auto backup; restore with validation; merge with conflict preview (fixed); remove dead handlers | Med |
| WU15 | **Packaging & polish** | NSIS config; icon; electron-rebuild for better-sqlite3; es-VE locale pass; accessibility pass; final integration | Med |

**Dependency order:** WU1 → WU2 → WU3 → WU4 (auth unblocks all role-guarded modules) →
WU5, WU6 (parallel-safe) → WU7 → WU8 → WU9 (depends on WU6 ref-ranges) → WU10, WU11
(parallel-safe after WU9) → WU12 → WU13, WU14 (parallel-safe) → WU15.

**Chained-PR strategy:** given most WUs sit near/under 400 lines and the slices above
keep the ⚠ ones under budget, a **stacked-to-main** chain is recommended (each PR
targets the previous, merges to main in order) for speed-first iteration. The
`chained-pr` skill applies to the ⚠ sub-sliced WUs.

---

## Risks

- **Clinical-safety regressions**: the ref-range selection logic is the highest-risk
  area; without tests (WU1 Vitest + WU6/WU9 coverage) a subtle age/sex bug could ship.
  Mitigation: Vitest is Must; RED-GREEN on ref-range selection.
- **Production DB migration data loss**: the lab's real DB must upgrade in place.
  Mitigation: `001_baseline` recognizes v1; pre-migration automatic backup; transactional
  migrations; rollback on failure. Test the migration against a COPY of the prod DB first
  (opened inside Electron, never system Node).
- **better-sqlite3 ABI in CI/packaging**: rebuild must run in the packaged build pipeline.
  Mitigation: `@electron/rebuild` (already a devDep) wired into the build; never open the
  DB from system Node tooling.
- **PDF fidelity across printers**: printToPDF + CSS pagination can drift per printer driver.
  Mitigation: WYSIWYG preview (N11.1); test on the lab's actual printer.
- **Scope creep**: 84 FRs + 45 NFRs is large for a single rebuild. Mitigation: the Must/Should/
  Could split + 15-WU slicing keep v2.0 bounded; Should/Could are explicitly deferred.
- **Dual sqlite dependency removal**: removing `sqlite3` must be verified against any hidden
  import. Mitigation: WU1 grep audit before removal; only better-sqlite3 is referenced in `electron/`.
- **Offline BCV rate staleness**: manual rate entry can go stale. Mitigation: surface the
  rate's last-updated date in the UI and on the cierre de caja.

## Ready for Proposal

**Yes.** The product decision is FINAL, the v1 evaluation is verified, the FR/NFR
catalogs are complete (84 FRs / 45 NFRs), and the architecture is decided (Option B,
clean-slate with v1 schema as baseline migration). The orchestrator should tell the
user:

- The exploration is complete and written to
  `openspec/changes/labcore-pro-rebuild/exploration.md`.
- Recommended next phase: **sdd-propose** to turn this into a formal change proposal
  (intent, scope, approach, rollback plan) — the proposal should adopt Option B and
  the 15-work-unit slicing, and confirm the Must/Should/Could boundary with the user
  (specifically whether insurers/empresas + price lists (M17) and print queue (M15)
  are v2.0 Should or deferred to v2.1).
- One open product question worth confirming at proposal time: **is auto-update
  (N7.3) needed for v2.0**, given the lab is offline and updates would arrive via USB?
