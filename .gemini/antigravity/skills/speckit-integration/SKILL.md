---
name: speckit-integration
description: Integrates GitHub Spec Kit (specify CLI) with the existing skill ecosystem. Maps speckit commands to professional-planner phases and existing skills. Use when setting up SDD with spec-kit, running speckit commands, or bridging spec-kit artifacts with project-tracker.
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires Python 3.11+ and uv for spec-kit CLI."
allowed-tools: Bash(node:*) Read
metadata:
  trigger: ["speckit", "specify", "spec-kit", "specify init", "speckit.constitution", "speckit.specify", "speckit.plan", "speckit.tasks", "speckit.implement"]
  scope: [global, project]
  version: "1.0.0"
---

# 🔗 Spec Kit Integration

Bridges GitHub's [Spec Kit](https://github.com/github/spec-kit) (112k stars) with this skill ecosystem. Spec Kit provides the SDD scaffolding; your 59+ skills provide the domain content.

## 📋 When to Use

- Use when bootstrapping a new project with `specify init`
- Use when running `/speckit.constitution`, `/speckit.specify`, `/speckit.plan`, `/speckit.tasks`, or `/speckit.implement`
- Use when you want spec-kit's file scaffold but guided by your existing skills
- Do NOT use for single-file changes (use `professional-planner` directly)

## 🚦 Hard Rules

- **Always** run `specify init --here --integration opencode` to bootstrap before any speckit commands
- **Always** load the relevant domain skill before running `/speckit.implement` (e.g., Express, Prisma, Expo)
- **Never** let speckit override your existing architecture decisions — the AGENTS.md constitution wins
- **Never** skip `/speckit.clarify` before `/speckit.plan` on complex features

## 🗺️ Spec Kit Phase → Your Skills Mapping

| Spec Kit Command | Equivalent Phase | Skills to Load |
|---|---|---|
| `specify init` | Setup | `01-planning-process/project-tracker` |
| `/speckit.constitution` | AGENTS.md rules | `06-code-quality/solid-clean-code` |
| `/speckit.specify` | Phase 2 (PRD) | `01-planning-process/project-tracker` |
| `/speckit.clarify` | Phase 1 (Briefing) | `01-planning-process/application-workflow` (if e-commerce) |
| `/speckit.plan` | Phase 3 (Design) | `04-backend/api-design`, `04-backend/prisma-orm`, `04-backend/socketio` |
| `/speckit.analyze` | Pre-Phase 4 audit | `02-dev-roles/code-reviewer`, `02-dev-roles/dod-checker` |
| `/speckit.tasks` | Phase 4 (Tasks) | `06-code-quality/pnpm-workspaces`, `06-code-quality/turborepo` |
| `/speckit.checklist` | Quality gate | `02-dev-roles/qa-tester` |
| `/speckit.implement` | Phase 5 (Implement) | ALL domain skills for the tech stack |
| Post-implement | Phase 6 (Verify) | `02-dev-roles/dod-checker`, `02-dev-roles/qa-tester` |

## 🛠️ Quick Start

```bash
# 1. Install spec-kit CLI (requires uv)
uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@v0.10.2

# 2. Bootstrap project
specify init my-project --integration opencode
cd my-project

# 3. Load AGENTS.md from your skill catalog into the project
# Copy or symlink your AGENTS.md to the project root

# 4. Install skills into the project
node ./00-meta-skills/skill-sync/scripts/install-skills.mjs --target ./my-project --symlink

# 5. Start the SDD flow
# Open your AI agent and run:
/speckit.constitution "Code quality, testing standards, security first, pnpm only"
# The agent will now have both speckit commands AND your 59+ skills
```

## 📂 Artifact Storage Convention

| Artifact | Spec Kit Path | Your System Equivalent |
|---|---|---|
| Constitution | `.specify/memory/constitution.md` | AGENTS.md rules |
| Feature Spec | `specs/{feat}/spec.md` | `openspec/changes/{feat}/proposal.md` |
| Plan | `specs/{feat}/plan.md` | `openspec/changes/{feat}/design.md` |
| Research | `specs/{feat}/research.md` | `project-tracker` Decision Log |
| Data Model | `specs/{feat}/data-model.md` | `packages/contracts/src/*.ts` |
| Contracts | `specs/{feat}/contracts/` | `packages/contracts/src/*.ts` |
| Tasks | `specs/{feat}/tasks.md` | `openspec/changes/{feat}/tasks.md` |

## 🔄 Dual Workflow: Use spec-kit OR Your System Directly

```
specify init  →  /speckit.constitution  →  /speckit.specify  →  /speckit.plan
     │                                                    │
     │          YOUR 59+ SKILLS                           │
     │    (Express, Prisma, Expo, JWT, etc.)              │
     └────────────────────────────────────────────────────┘
                              │
                    /speckit.implement
                              │
              Code generated with domain knowledge
              from your skills, structured by spec-kit
```

## 📚 References

- [Spec Kit GitHub](https://github.com/github/spec-kit)
- [Spec Kit Docs](https://github.github.io/spec-kit/)
- `professional-planner/SKILL.md` — your native SDD orchestrator
- `06-code-quality/pnpm-workspaces/SKILL.md` — monorepo conventions
