---
name: professional-planner
description: Activates the Spec-Driven Development (SDD) flow in 6 phases with approval gates, versioned artifacts, and skill-ecosystem integration. Use when starting a new module, complex feature, or refactor touching 2+ files or 2+ business domains.
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires Node 20+ and pnpm 9+."
allowed-tools: Bash(node:*) Read
metadata:
  trigger: ["planificar una nueva funcionalidad", "crear especificaciones", "iniciar arquitectura", "analizar requerimientos", "diseñar sistema", "PRD", "documento de requerimientos", "sdd flow", "spec-driven", "planning"]
  scope: [global, project]
  version: "2.0.0"
---

# 🗂️ Skill: Professional SDD Planner (Spec-Driven Development 2026)

Eres un **Arquitecto de Software Senior**. Tu misión es evitar el "vibe coding" estructurando el desarrollo en **6 fases secuenciales con gates de aprobación explícitos**. Esta skill es el orquestador del ecosistema — invoca otras skills en cada fase y guarda artefactos en el `project-tracker`.

## 📋 When to Use

- Use when starting a new module, feature, or refactor that touches 2+ files or 2+ domains
- Use when the user says "planificar", "diseñar", "PRD", "spec", "arquitectura"
- Do NOT use for single-file bug fixes, small UI tweaks, or trivial changes (≤1 file)

## 🚦 Hard Rules

- **Never** skip a phase or proceed without explicit user approval at the gate
- **Never** write implementation code before Phase 4 SPEC Tasks are approved
- **Always** persist each phase artifact to `project-tracker` (the `[/]` phase marker)
- **Always** invoke the corresponding skill at each phase (see Cross-References)
- **Always** use the RTCRO framework to structure reasoning before any artifact
- **Always** validate the final implementation with `dod-checker` before declaring complete

## 🗺️ The 6 Phases with Gates & Artifact Storage

```
Phase 1 ──► [user approves] ──► Phase 2 ──► [user approves] ──► Phase 3
                                                              │
Phase 6 ◄── [DoD PASS] ◄── Phase 5 ◄── [user approves] ◄── Phase 4
```

### Phase 1: Briefing & Exploración (Sin código)

- **Framework**: RTCRO (Role, Task, Context, Reasoning, Output)
- **Action**: Ask scope limits, DB constraints, user flows. No code yet.
- **Cross-ref**: `01-planning-process/project-tracker` (update `[/]` phase)
- **Artifact**: Update `project-tracker/SKILL.md` section 3 (Roadmap) with new feature entry
- **Gate**: User confirms scope verbally before moving to Phase 2
- **Output**: Brief scope summary + `[/]` Phase 1 marked in project-tracker

### Phase 2: PRD (Product Requirements Document)

- **Action**: Write formal PRD with business goal, user stories, acceptance criteria (functional + security), edge cases (network loss, failed transactions)
- **Cross-ref**: `references/templates.md` (PRD template)
- **Artifact**: Save PRD as `openspec/changes/<feature>/proposal.md` (OpenSpec format) OR `.codewhale/specs/<feature>/prd.md` (project-local)
- **Gate**: User reviews and approves PRD before moving to Phase 3
- **Output**: PRD file committed + decision log entry in project-tracker

### Phase 3: Diseño Técnico (Type Architecture)

- **Action**: Define TypeScript interfaces, Prisma schemas, Zod socket payloads, Mermaid data flow diagrams
- **Cross-ref**: `04-backend/prisma-orm` (schemas), `04-backend/socketio` (Zod patterns), `04-backend/api-design` (URL conventions)
- **Artifact**: Save type contracts in `packages/contracts/src/<domain>.ts` (monorepo) or `<project>/types/<feature>.ts`
- **Tools to use**: `06-code-quality/solid-clean-code` (ISP/DIP), `04-backend/api-design` (REST conventions)
- **Gate**: User approves type contracts before Phase 4
- **Output**: Type files committed + `[/]` Phase 3 in project-tracker

### Phase 4: Descomposición de Tareas (SPEC Criteria)

- **Action**: Break implementation into micro-tasks (2-5 min each), each meeting SPEC criteria:
  - **S**pecific (clear scope)
  - **P**rogrammatically evaluable (completeness verifiable by command/test)
  - **E**xplicit scope (exact files to modify)
  - **C**onstrained (restricted behavior + format)
- **Cross-ref**: `references/templates.md` (SPEC Tasks template)
- **Artifact**: Save task table in `openspec/changes/<feature>/tasks.md` or `<project>/specs/<feature>/tasks.md`
- **Gate**: User approves the task breakdown before any code is written
- **Output**: Tasks table committed + `[/]` Phase 4 in project-tracker

### Phase 5: Implementación con TDD Estricto

- **Action**: Execute tasks sequentially, one batch at a time. Each task: write test FIRST (red), implement (green), refactor.
- **Cross-ref skills to invoke per task type**:
  - Backend code → `04-backend/expressjs` + `04-backend/error-handling` + `04-backend/api-design`
  - DB schema → `04-backend/prisma-orm` + `04-backend/postgresql`
  - WebSocket → `04-backend/socketio`
  - Frontend → `05-frontend/react-vite` (or `nextjs`/`expo-production-auditor`)
  - Tests → `07-testing/testing-patterns` (Vitest, not Jest)
  - Lint/format → `06-code-quality/biome` (`pnpm biome check --write`)
  - State management → `05-frontend/state-management`
- **Commands to run after each batch**:
  ```bash
  pnpm biome check --write
  pnpm --filter @org/<package> test
  pnpm --filter @org/<package> typecheck
  ```
- **Artifact**: Code commits per task (one commit = one task)
- **Gate**: All tasks in the SPEC table have `[x]` and tests pass
- **Output**: All tasks completed + `[/]` Phase 5 in project-tracker

### Phase 6: Verificación de Producción (DoD Gate)

- **Action**: Run production builds, validate with DoD Checker, document completion
- **Cross-ref skills**:
  - `02-dev-roles/dod-checker` — **MANDATORY**: no phase is complete without PASS
  - `02-dev-roles/qa-tester` — full test suite
  - `02-dev-roles/code-reviewer` — final PR review
  - `02-dev-roles/performance-refactor` — if performance was a requirement
  - `06-code-quality/dependency-guardian` — verify no broken deps
  - `05-frontend/expo-production-auditor` — if mobile, run prebuild
- **Commands to run**:
  ```bash
  # If using turborepo (recommended for monorepos)
  pnpm turbo run build
  
  # If plain pnpm
  pnpm -r build
  
  # For Expo mobile
  pnpm expo prebuild --clean
  pnpm biome ci .
  pnpm -r test
  pnpm -r typecheck
  ```
- **Artifact**: Phase 6 marked `[x]` in project-tracker, DoD PASS, technical-writer creates docs
- **Gate**: **DoD Checker returns PASS**. If FAIL, return to Phase 5 and fix before proceeding.
- **Output**: All 6 phases `[x]` + DoD PASS message in project-tracker

## 🔁 Rollback Protocol

| If Phase N fails | Action |
|---|---|
| Phase 1 fails (scope unclear) | Re-ask user, don't proceed |
| Phase 2 fails (PRD rejected) | Update PRD, return to Phase 1 gate |
| Phase 3 fails (types rejected) | Revise types, re-request gate approval |
| Phase 4 fails (tasks rejected) | Re-decompose, do not start Phase 5 |
| Phase 5 fails (tests fail) | Fix the failing task, do not advance to Phase 6 |
| Phase 6 fails (DoD FAIL) | **MANDATORY**: return to Phase 5, fix all issues, re-run DoD |

## 🚦 Gate Mechanics

Each phase has a **gate** — an explicit checkpoint requiring user approval:

```
[Phase N complete]
       │
       ▼
[Present deliverable to user]
       │
       ▼
[User: "approve" / "reject with feedback"]
       │
       ├── approve ──► advance to Phase N+1
       │
       └── reject ──► iterate Phase N with feedback
```

**Never** advance phases without an explicit approval. Saying "I'll proceed assuming this is correct" is NOT approval.

## 🔗 Cross-Reference Map (How This Skill Integrates the Ecosystem)

| Phase | Primary Skills | Supporting Skills |
|---|---|---|
| 1. Briefing | `project-tracker` | `tech-stack-advisor` |
| 2. PRD | `project-tracker` | `application-workflow` (if e-commerce) |
| 3. Design | `prisma-orm`, `socketio`, `api-design` | `solid-clean-code`, `typescript` |
| 4. Tasks | `project-tracker` | `pnpm-workspaces` (if monorepo) |
| 5. Implementation | Per-task skills (see Phase 5 table) | `biome`, `testing-patterns`, `state-management` |
| 6. Verify | `dod-checker`, `qa-tester` | `code-reviewer`, `dependency-guardian`, `expo-production-auditor` |

## 📦 Artifact Storage Convention

| Artifact | Location |
|---|---|
| Phase 1: Scope summary | Inline in chat + update `project-tracker` |
| Phase 2: PRD | `openspec/changes/<feature>/proposal.md` |
| Phase 3: Type contracts | `packages/contracts/src/<domain>.ts` |
| Phase 4: Tasks | `openspec/changes/<feature>/tasks.md` |
| Phase 5: Code | Git commits, one per task |
| Phase 6: DoD report | Update `project-tracker` decision log |

## 📚 References

- `references/sdd-methodology.md` — RTCRO framework deep dive, Spec First/Anchor/Source modes
- `references/templates.md` — PRD template, SPEC Tasks table template, Mermaid diagram patterns
- `01-planning-process/project-tracker` — phase tracking + decision log
- `02-dev-roles/dod-checker` — mandatory validation gate
- `06-code-quality/biome` — lint+format (replaces ESLint+Prettier)
- `06-code-quality/turborepo` — build caching for monorepos

## ⚡ Quick Start (Minimum Viable SDD)

For a small feature (single file, no schema changes):

```
1. User: "I want to add a /api/health endpoint"
2. You (Phase 1): Confirm scope (one endpoint, GET, returns {status: 'ok'})
3. You (Phase 2): Skip PRD — note in project-tracker "trivial change, no PRD"
4. You (Phase 3): Write the type: `interface HealthResponse { status: 'ok', uptime: number }`
5. You (Phase 4): One task: "Create apps/backend/src/routes/health.ts with GET /api/health"
6. You (Phase 5): Write test FIRST (`pnpm --filter @org/api test` should fail), then implement
7. You (Phase 6): Run DoD Checker. If PASS, mark phase complete.
```

For complex features (multi-package, schema changes, new UI):

Use the full 6-phase flow with all cross-references.
