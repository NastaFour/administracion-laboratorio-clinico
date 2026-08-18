# Proposal: LabCore Pro Rebuild (v2.0)

> Change: `labcore-pro-rebuild` · Store: openspec · Date: 2026-08-18
> Adopts `exploration.md` verbatim: 17 modules, 84 FRs (60 Must / 18 Should / 6 Could), 45 NFRs, Option B, 15 work units.

## Intent

Rebuild LabCore as a professional offline-first desktop app for ONE Venezuelan clinical laboratory. v1 is structurally broken: the PDF engine hardcodes machine paths and bioanalyst credentials, the dashboard is 100% fabricated, result entry shows wrong reference ranges (clinical risk), there is no auth/audit, payments are a boolean flip, and ~40 Tailwind classes resolve to nothing. The primary user is a non-technical bioanalyst (owner's mother) plus 1–2 reception/technician users; the tool must be reliable daily, es-VE, keyboard-first.

## Product Decisions (user-owned, FINAL — spec/design/tasks MUST inherit)

| # | Decision |
|---|---|
| D1 | Desktop pro rebuild: Electron 33 + Vite 7 + React 19 + TS 5.9 + better-sqlite3; offline-first; single lab; es-VE UI; extreme usability for non-technical staff |
| D2 | Option B clean-slate `src/{main,preload,renderer,shared}`; v1 schema captured as migration `001_baseline`; production DB upgrades in place with zero data loss; v1 code stays in git history as reference only |
| D3 | Tailwind 4 (`@tailwindcss/vite`) + design-token layer (anti-AI-slop); Zustand 5; Zod 4 shared contracts validated on BOTH IPC sides; typed preload API; Vitest MUST (clinical ref-range logic cannot ship untested); numbered migration runner; printToPDF with redesigned generic multi-exam template (config-driven logo/credentials, no `webSecurity:false`, proper font handshake, A4 pagination) |
| D4 | Single site only — NO sede dimension in the DB |
| D5 | Payments MIXED: pay-before-delivery as norm + credit accounts with partial payments (abonos) for special/recurrent cases; deposit at order creation, balance at delivery; delivery blocked on pending balance except authorized credit; Bs/USD with exchange rate (show last-updated); pago móvil with reference number; punto/efectivo/transferencia; daily cierre de caja consolidating both moments |
| D6 | Result delivery: print-fidelity A4 PDF + organized digital files (by patient/date) for manual distribution by the owner; NO in-system WhatsApp/email sending; print queue DEFERRED to v2.1 |
| D7 | No insurers/convenios in v2.0 (architectural placeholder table only); exam catalog MUST support marking exams as outsourced (`tercerizado`) with provider name — provider is INTERNAL data, invisible on the patient report; third-party results transcribed manually |
| D8 | Validation state machine `Pendiente → Capturado → Validado`; bioanalyst capturing validates immediately; technician capture stays pending validation; ONLY validated results can be printed/delivered; PDF carries the validating bioanalyst's signature block |
| D9 | Pediatric patients are FREQUENT: reference-range model supports age in days/months/years (unit + value), neonates included |
| D10 | Dashboard with 100% REAL data, four views: today's orders & collections; debtors with aging; lab statistics (top exams, monthly revenue vs previous); per-patient analyte trends |
| D11 | No auto-update; NSIS installer MUST support clean upgrade-install over old version preserving the DB (userData untouched) with a documented pre-upgrade backup step |

## Scope

### In Scope — v2.0 Must (60 FRs → 15 WUs)

- WU1–WU15 per exploration slicing: scaffold → contracts+preload → DB/migrations → auth/audit → patients → catalog+ref-ranges → orders+medico → sampling → results+validation → PDF → payments+cierre → history+dashboard → config split → backup/import/export → packaging/polish.
- Refinements from decisions: tercerizado flag (D7), days/months/years age-unit ranges (D9), mixed payment model with delivery block (D5), 4-view real dashboard (D10), `Pendiente → Capturado → Validado` workflow with signature block (D8).
- Must NFRs: offline-first, bcrypt + role guards + no `webSecurity:false`, numbered transactional migrations with pre-migration backup, Vitest on clinical modules, NSIS upgrade preserving userData, es-VE locale, keyboard-first usability, print fidelity.

### Should (v2.0, only if capacity allows)

Change own password, login throttling, patient merge, catalog import/export, barcode labels, sample reject-with-reason, "COPIA" report copy, automatic backups + retention, dashboard charts, per-exam comments, order cancel/void, print defaults.

### Out of Scope (deferred)

- Print queue (M15) → v2.1 (D6).
- Insurers/convenios + price lists (M17) → placeholder table only (D7); empresa billing, medico stats (Could).
- Auto-update (N7.3) and code signing (N7.2) (D11).
- In-system WhatsApp/email result sending (D6).
- Multi-sede support (D4).

## Capabilities

> Contract with sdd-spec. `openspec/specs/` is empty (greenfield) — all capabilities are NEW full specs.

### New Capabilities

- `auth-roles`: login, roles (admin/bioanalista/tecnico/recepcion), session + idle lock, user CRUD
- `patients`: CRUD with cédula, indexed search, soft-delete, history view
- `exam-catalog`: exam/parameter CRUD, qualitative results, tercerizado flag + internal provider
- `reference-ranges`: sex-aware, age-unit-aware (days/months/years) ranges, out-of-range flagging
- `orders`: order with exam list + medico referente, status workflow, lock-after-finalize
- `sampling`: sample registration + status per order/exam
- `result-validation`: capture with correct ranges, `Pendiente → Capturado → Validado`, role guard, immutability with admin override
- `pdf-reporting`: generic multi-exam A4 PDF, pagination, config-driven header/signature, print + preview + print audit
- `payments-cierre-caja`: methods, Bs/USD + BCV rate, references, abonos, delivery block, daily close
- `history`: global order history with filters, re-print/re-export
- `dashboard`: real KPIs across the four views (D10)
- `audit-log`: append-only audit + admin viewer
- `configuration`: lab/bioanalyst/BCV/print config, split settings screens, merge fix
- `backup-import-export`: manual + automatic backup, validated restore, merge with conflict preview
- `medico-referente`: referring-doctor CRUD, selectable on order, shown on report

### Modified Capabilities

None — greenfield specs; every capability above is new.

## Approach

Option B (per exploration): clean-slate `src/main | src/preload | src/renderer | src/shared` in the same repo. Migration `001_baseline` captures the v1 schema verbatim so the production DB upgrades in place with zero data loss; `002_rebuild` adds the new tables/columns (orden_examenes, pagos, cierre_caja, medico_referente, audit_log, muestras, validation columns, age-unit support, tercerizado, insurer placeholder). Zod 4 contracts in `src/shared/contracts` validated on both IPC sides; typed preload with channel allowlist. Zustand 5 for session/config/toasts + thin `useIpcQuery` hooks. Tailwind 4 + token layer kills the dead-class defect. PDF via Electron `printToPDF` with redesigned template (bundled logo asset, config-driven creds, `document.fonts.ready` handshake, `@page` pagination, sandboxed window). Vitest with RED-GREEN on clinical-critical modules (ref-range selection, age calc, payment math, migrations). Delivery: 15 WUs, stacked-to-main chained PRs, ≤400 changed lines each (⚠ WU3/9/10/11 sub-sliced per exploration).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/main`, `src/preload`, `src/renderer`, `src/shared` | New | Clean-slate app (all WUs) |
| `electron/`, current root `src/` | Removed | Kept in git history as reference only; excluded from build/files |
| `lab_clinical.db` (dev + prod userData) | Modified | Upgraded in place via migrations 001/002 |
| `package.json` | Modified | Remove `sqlite3`; add Vitest, Tailwind 4, Zustand 5, Zod 4; retarget `main` entry |
| electron-builder / NSIS config | Modified | Upgrade-install preserving userData; icon; electron-rebuild wired |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Clinical ref-range regression ships | Med | Vitest MUST; RED-GREEN on range selection + age calc; ≥80% coverage on clinical modules |
| Production DB migration data loss | Med | `001_baseline` recognizes v1; pre-migration auto backup; transactional migrations; test on a COPY of the prod DB inside Electron |
| better-sqlite3 ABI mismatch in tooling | Med | `@electron/rebuild` in build pipeline; never open the DB from system Node |
| PDF print fidelity per printer driver | Med | WYSIWYG preview (N11.1); test on the lab's actual printer |
| Scope creep (84 FRs / 45 NFRs) | High | Must/Should/Could boundary enforced; D4–D11 deferrals locked; 15-WU slicing with 400-line budget |
| Offline BCV rate staleness | Low | Rate last-updated surfaced in UI and on cierre de caja (D5) |

## Rollback Plan

- Pre-migration automatic backup runs before `001`/`002`; on migration failure the transaction rolls back, the backup is restored, and the user can relaunch the v1 NSIS binary.
- Each WU is a separate PR; any WU reverts via git without touching the DB (v2.0 migrations are additive-only).
- Installer never touches userData on upgrade-install; a documented manual backup step precedes any upgrade (D11).
- Worst case: v1 code remains in git history; reinstall the v1 binary against the pre-upgrade DB backup.

## Dependencies

- Pre-upgrade manual backup of the production `lab_clinical.db` (documented step, D11).
- `@electron/rebuild` wired into packaging (WU15).
- Lab logo asset + bioanalyst credentials available for config seeding (WU13).

## Success Criteria

- [ ] Production DB upgrades in place with zero data loss; migration verified on a prod-DB copy inside Electron.
- [ ] Result entry shows sex/age-unit-correct reference ranges (v1 clinical bug fixed), proven by tests.
- [ ] Multi-exam A4 PDF prints correctly on the lab's printer from config-driven data; no hardcoded paths or credentials.
- [ ] Dashboard shows 100% real data across the four views; empty states instead of fabricated numbers.
- [ ] Payments: deposit + balance, delivery blocked on pending balance (except authorized credit), daily cierre de caja consolidates both moments.
- [ ] All 60 Must FRs implemented across WU1–WU15; Vitest green on clinical modules; `npm run build` + NSIS upgrade-install verified end-to-end.
