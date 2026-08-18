---
name: skill-router
description: Deterministic router that pre-selects which skills an agent should load, replacing ~80% of stochastic LLM-based skill selection with exact trigger matching. Outputs primary skill + secondary candidates + SDD/trivial flags. Use BEFORE any agent turn that might invoke another skill, to shrink the agent's decision surface from 109 skills to 3-5.
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex, DeepSeek. Requires Node 20+."
allowed-tools: Bash(node:*) Read
metadata:
  trigger: ["skill router", "route skill", "which skill", "skill selection", "trivial diff", "needs sdd", "pre-invoke"]
  scope: [global, project]
  version: "1.0.0"
---

# Skill Router — deterministic skill pre-selection

Replaces ~80% of stochastic "which skill do I load?" reasoning with **exact trigger matching**. The agent only decides for the ~20% of cases where the router returns low confidence.

> Two-tier loading: this skill is **Tier 0** (always loaded, ~2K tokens). It tells the agent which **Tier 1** skills to load on-demand, so Tier 0 stays small instead of inflating to 109 skills × ~150 tokens.

## When to Use

- **Before any turn** that might invoke a skill: run `skill-router.mjs` first.
- When you want to know if a diff is **trivial** (skip SDD) or **needs SDD** (invoke `professional-planner`).
- When 2+ skills have semantic overlap (e.g. `nextjs` deprecated vs `nextjs-15`, `engram` vs `mcp-integration`) — the router resolves it deterministically via `deprecated` flag.

## When NOT to Use

- The agent already knows the skill (user invoked `/skill-name` explicitly).
- Pure chat with no code action.

## How it works

```
User input + (optional) staged diff
    ↓
skill-router.mjs (deterministic, classic Node)
    ↓
{
  primary:    "skill-name" | null,      // best exact match, null if confidence <0.6
  secondary:  ["skill-a", "skill-b"],   // other candidates
  needsSDD:   true | false,             // touches 2+ categories → invoke professional-planner
  trivial:    true | false,             // diff <20 lines + no critical markers → skip SDD
  skipJudgmentDay: true | false,        // diff <100 lines AND no auth/payments/migrations → code-reviewer only
  deprecatedHit: "nextjs" | null        // if user mentioned a deprecated skill, where to redirect
}
```

The agent calls this **first**, reads the output, then loads only `primary` (and optionally one `secondary`). Confidence <0.6 → agent falls back to its own judgment (the ~20% of cases).

## Run

```bash
node ./00-meta-skills/skill-router/scripts/skill-router.mjs --query "add OAuth login" [--diff <staged-lines>] [--json]
```

Flags:
- `--query "<text>"` — user input or task description (required).
- `--diff <N>` — number of staged lines (enables trivial/needsSDD/skipJudgmentDay heuristics).
- `--json` — machine output for piping.

## Matching algorithm (all deterministic)

1. **Load index**: parse every `SKILL.md` frontmatter once (cache). Build `triggers[]` + `description` + `deprecated` + `redirect`.
2. **Exact trigger match**: for each trigger (regex, case-insensitive), score against query. Exact phrase hit = 1.0.
3. **Keyword overlap**: for each top-level noun in query, count description hits. Score = min(hits/3, 0.5).
4. **Confidence**: max(exact, keyword)*0.7 + secondaryMatches*0.3.
5. **Deprecated handling**: if the top match has `deprecated: true`, return `deprecatedHit` and use `redirect` field as primary.
6. **Heuristics** (no LLM):
   - `needsSDD`: query touches 2+ distinct category prefixes (`04-backend`, `05-frontend`, etc.) AND diff >20 lines.
   - `trivial`: diff <20 lines AND query has no markers `auth|payment|prisma|migration|socketio|ssl|secret`.
   - `skipJudgmentDay`: diff <100 lines AND no markers `auth|payments|migration|sql|ssl`.

## Output contract

```json
{
  "primary": "expressjs",
  "secondary": ["jwt-bcrypt", "api-design"],
  "confidence": 0.92,
  "needsSDD": false,
  "trivial": false,
  "skipJudgmentDay": true,
  "deprecatedHit": null,
  "tier1toLoad": ["expressjs"]
}
```

`tier1toLoad` tells the agent exactly which Tier 1 skill bodies to read. Ky, 1-3 skills, not 109.

## Integration

- [`professional-planner`](../professional-planner/SKILL.md) — invoke when `needsSDD=true`.
- [`judgment-day`](../judgment-day/SKILL.md) — skip when `skipJudgmentDay=true`.
- [`kill-switches`](../kill-switches/SKILL.md) — abort if router returns confidence 0 on a critical-area query.

## Keywords
skill router, route skill, which skill, skill selection, trivial diff, needs sdd, pre-invoke