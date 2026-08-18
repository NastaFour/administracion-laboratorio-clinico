---
name: session-notes
description: ECC-inspired session-to-session context transfer. Records key decisions, discoveries, and context at session end so the next session starts with awareness. Use at the end of each development session or before context compaction.
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires Node 20+ and pnpm 9+."
allowed-tools: Bash(node:*) Read
metadata:
  trigger: ["session notes", "end session", "save context", "session summary", "before compaction", "handoff", "apuntes", "registro de sesión"]
  scope: [global, project]
  version: "1.0.0"
---

# 📝 Session Notes (ECC Pattern)

Inspired by ECC's session persistence hooks. When context resets (new session, compaction, next day), the agent starts blind. Session notes bridge that gap.

## 📋 When to Use

- Use at the end of every development session (always, no exceptions)
- Use before context compaction (the agent is about to forget everything)
- Use when handing off work to another developer or agent
- Use at natural checkpoints (Phase completion, bug fix, merge)

## 🚦 Hard Rules

- **Always** save session notes before ending a session
- **Always** include WHAT was done, WHY decisions were made, and WHAT is pending
- **Always** update `project-tracker` decision log with key entries
- **Never** save raw chat logs (noise) — synthesize only
- **Never** skip this when the session was productive

## 🛠️ Session Note Template

Save as `.codewhale/sessions/YYYY-MM-DD-<topic>.md` or `.sessions/YYYY-MM-DD.md`:

```markdown
# Session: <brief title>

- **Date**: 2026-06-14
- **Duration**: ~2h
- **Phase**: Phase 3 (Design) — Employee Web Admin Panel
- **Agent**: OpenCode (deepseek-v4-pro)

## 🎯 Goals
- [x] Design the inventory management schema
- [x] Define API contracts for product CRUD
- [ ] Start employee auth flow (deferred to next session)

## 🧠 Key Decisions
1. **Decision**: Use Prisma enum for product categories vs string
   - **Why**: Type safety, better than magic strings
   - **Rejected alternative**: String enum (harder to validate)
2. **Decision**: Separate `inventory` table from `products` for stock tracking
   - **Why**: Historical stock data needed for audit trail, not just current quantity

## 🐞 Bugs Found & Fixed
- **Socket.io reconnection timeout**: Changed from default to 10s for mobile networks
- **Prisma migration drift**: Added `pnpm prisma migrate dev --create-only` to workflow

## 🔬 Discoveries
- Expo Location API requires foreground + background permissions for drivers
- BCV API rate limits: 10 req/min, need caching layer

## 📂 Files Modified
- `apps/backend/prisma/schema.prisma` — added `inventory` model
- `packages/contracts/src/product.ts` — Zod schemas for CRUD
- `apps/admin-panel/src/components/InventoryGrid.tsx` — new component

## ⏭️ Next Session
1. Start employee auth flow (JWT + bcrypt)
2. Wire up inventory grid to API
3. Write tests for product CRUD endpoints

## 📊 Project Tracker Status
- **Active Phase**: `[/]` Phase 3 — 60% complete
- **Next Phase**: Phase 4 (Mobile Client)
- **Blockers**: None
```

## 🔄 Integration with Project Tracker

After saving session notes, update `01-planning-process/project-tracker/SKILL.md`:

```markdown
## 4. 🧠 Decision Log
- [2026-06-14] Session: Inventory schema design. Decisions: Prisma enum for categories, separate inventory table. See `.sessions/2026-06-14-inventory-design.md`.
```

## 🔗 Compact Survival Protocol

When the context is about to compact, the agent must:

1. **Save session notes immediately** (use this template)
2. **Call mem_context if MCP is available** (engram)
3. **Update project-tracker** with current phase status
4. **Leave a breadcrumb** in the chat for the next agent:

```
--- COMPACTION BOUNDARY ---
Session notes saved: .sessions/2026-06-14.md
Active phase: Phase 3 (Design)
Next task: Wire inventory grid to API
Key decision: Separate inventory table for audit trail
```

## 📚 References

- [ECC Session Persistence](https://github.com/affaan-m/ECC/blob/main/the-longform-guide.md)
- `01-planning-process/project-tracker/SKILL.md` — Decision Log
- `01-planning-process/engram-integration/SKILL.md` — MCP memory (if available)

## 🧠 Continuous Learning Rule (ECC Pattern)

Inspired by ECC's continuous learning pattern. When a session reveals a repeatable problem or pattern, extract it into a reusable skill.

### When to Create a Skill

If you had to repeat a prompt **2+ times** or the agent ran into the **same problem twice**, that pattern must become a skill:

1. **Identify the pattern**: What did you fix? What workaround did you discover?
2. **Create the skill** with `00-meta-skills/skill-creator`:
   ```
   "Create a new skill called <name>. It should cover <pattern discovered>."
   ```
3. **Add to Auto-Invoke List** in `AGENTS.md` with the trigger
4. **Run `skill-sync`** to distribute to all tools
5. **Note in session notes**: what skill was created and why

### Example

```
Session notes:
- Pattern discovered: Expo prebuild always fails when new native deps are added
- Created skill: `expo-native-deps` with trigger "expo install", "native dependency"
- Added auto-invoke entry: "Instalar dependencia nativa Expo" → `expo-production-auditor`
```

This prevents wasting tokens and time on the same problem in future sessions.
