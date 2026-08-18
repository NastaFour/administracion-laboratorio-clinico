---
name: skill-loader
description: Tier 0/1 enforcement for the skills catalog. Caches skill frontmatter with mtime, emits tier0-context.json (12 always-on skills, ~2K tokens) on first run, and per-turn emits tier1-instructions.txt with ONLY the bodies of skills the router selected via tier1toLoad[]. Enforces the "route first" rule: a skill outside the current tier1toLoad must be re-routed before being read. Use at agent boot to bootstrap tier-0 context, and at every turn before reading another skill's body.
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex, DeepSeek. Requires Node 20+."
allowed-tools: Bash(node:*) Read Write
metadata:
  trigger: ["load skills", "tier 0", "tier 1", "skill context", "bootstrap context", "preload skills", "skills loader"]
  scope: [root-only]
  version: "1.0.0"
---

# 🚚 Skill: Tier 0/1 Loader (skill-loader)

Reduces the **~110 SKILL.md files × full body** overload (~110K tokens) into a
**~2K-token Tier 0 + 3-5K Tier 1** per turn, by enforcing a tier system on top
of the catalog.

---

## 🚦 Tier System

| Tier | Definition | When Loaded | Where |
|------|------------|-------------|-------|
| **0** | Always-on house meta: skill-router, skill-validator, skill-sync, skill-creator, skill-loader, professional-planner, agents, idea-to-prd-express, project-tracker, session-notes, decision-gate, dod-checker | Agent boot | Inline in system prompt (`tier0-context.json`) |
| **1** | Skills selected per turn by `skill-router` via `tier1toLoad[]` | Each turn | `tier1-instructions.txt` |
| **2** | Everything else | On demand, only after explicit re-route | Direct Read |

---

## 🛠️ CLI

```bash
# Emit/refresh tier0-context.json (one-time at boot or after catalog changes)
node skills-loader.mjs --emit-tier0

# Run a turn: invoke router internally, then emit tier1-instructions.txt
node skills-loader.mjs --turn "add OAuth login" --diff 50 --emit-tier1

# Check if a skill is allowed to be read THIS turn (route first)
node skills-loader.mjs --check auth-flow-audit
# → { "allowed": true } | { "allowed": false, "reason": "route-first" }
```

The `--check` flag implements the **"route first" rule**: a skill body may
only be read if it's either Tier 0 OR the router picked it for this turn's
`tier1toLoad[]`. Reading a Tier 2 skill directly produces an error envelope.

---

## 📋 Caching

A single JSON cache lives at `~/.skill-router-cache.json` with one mtime entry
per SKILL.md. The loader:

1. Walks the catalog once (boot or first turn).
2. Computes mtime for each SKILL.md. If equal to cached value, reuses parsed
   frontmatter. If not, re-parses (no full body re-read needed for tier-0 emit
   when the cache is fresh).
3. Emits `tier0-context.json` only when at least one Tier 0 source mtime
   changed since the last emit (otherwise no-op).
4. Per-turn, the router is invoked on the cached frontmatter index (no re-walk).

This keeps the per-turn cost at <50ms for a cold cache and <5ms for a warm one.

---

## 🧱 Why Three Tiers?

- **Tier 0** is the project's "house memory" — the rules the agent must
  follow every turn (SDD gates, DoD, decision-making protocol, skill-system
  meta).
- **Tier 1** is the small working set picked by the deterministic router
  (3-5 skills per turn), driven by trigger words.
- **Tier 2** is the long tail: 90+ skills that exist for when Tier 0/1 aren't
  enough. Reading them mid-turn is wasteful and dilutes context.

The "route first" rule is what makes this enforceable: agents cannot just
read any SKILL.md on a whim — they have to route the query first and only
then read the matched skill's body.
