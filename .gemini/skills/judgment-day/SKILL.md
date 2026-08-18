---
name: judgment-day
description: Parallel adversarial review where two independent judges review the same target (spec, design, or diff) from opposing stances and surface blind spots before merge. Use after SDD Design or before PR to catch what a single reviewer would miss.
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires two agent sessions (or two sub-agents) and Node 20+."
allowed-tools: Bash(node:*) Read
metadata:
  trigger: ["judgment day", "adversarial review", "parallel review", "two judges", "red team", "spec challenge", "design challenge", "merge gate", "pre-merge review"]
  scope: [global, project]
  version: "1.0.1"
  min_diff_lines: 100
  critical_markers: ["auth", "payments", "migration", "sql", "ssl", "secret", "jwt", "bcrypt"]
---

# Judgment Day — Parallel Adversarial Review

## Pre-condition guard (enforced by `skill-router`)

Run `judgment-day` ONLY when:
- staged diff is **≥ 100 lines** AND touches **critical markers** (auth, payments, migrations, sql, ssl, secret, jwt, bcrypt), OR
- the user explicitly requests it on a non-trivial change.

Else: use [`code-reviewer`](../code-reviewer/SKILL.md) only (1 reviewer, no parallel escalation). The `skill-router` sets `skipJudgmentDay=true` for diff <100 lines with no critical markers.

# Judgment Day — Parallel Adversarial Review

Two independent judges review the same target from opposing stances. The goal is not consensus — it is **conflict surfacing**. Whatever both judges independently flag is almost certainly real; what only one flags is a hypothesis worth checking. Never run merge on a target that has not survived Judgment Day for non-trivial changes.

`judgment-day` belongs to the SDD family (see [`professional-planner`](../professional-planner/SKILL.md)). It slots in **after** `sdd-design` / `sdd-spec` and **before** `sdd-apply` or before opening a PR. It is the cheap insurance that costs ~2× one review but catches the class of defects a single reviewer is structurally blind to.

## When to Use

- After a spec or design is written but before implementation.
- Before opening a PR for a non-trivial change (2+ non-trivial files).
- When the author is too close to the code to see their own assumptions.
- When the cost of being wrong is higher than the cost of a second review.
- **Do NOT use** for trivial diffs (docs, formatting, single-line fixes) — it wastes two contexts.

## Setup

```
Session A (Judge 1)        Session B (Judge 2)        Orchestrator (you)
─────────────────────     ─────────────────────     ─────────────────────
Fresh context             Fresh context              Author of the target
Same target material      Same target material       Reads both verdicts
Different stance ↓        Different stance ↓         Surfaces overlap + deltas
Independent verdict       Independent verdict        Decides go/no-go
```

Two sessions must be **independent**: neither sees the other's verdict until both are sealed. If using sub-agents (Task tool), launch them in parallel with no shared message history. If using a single agent, run two passes with `clear-context` in between — never let judge 2 read judge 1's output first.

## The two stances

| Judge | Stance | What it hunts |
|---|---|---|
| **Red** (challenger) | "How does this break?" | Failure modes, edge cases, race conditions, security holes, divergence between spec and design, assumptions that will not hold under load or hostile input. |
| **Blue** (advocate) | "How does this fail to deliver?" | Missing requirements, undersized scope, UX dead-ends, ambiguity that will cause rework, places where the design does not actually solve the user's problem. |

Both judges get the **same target material**: the spec, the design doc, or the staged diff. Both must answer the same prompt template (below) so their verdicts are comparable.

## Prompt template (identical for both judges)

```
You are {Red|Blue} judge on Judgment Day for: {target name}.

Stance: {challenger — how does this break? | advocate — how does this fail to deliver?}

Target material (do not request more; work from what is here):
{paste spec / design / diff}

Answer under these four headings, in order, with severity tags:
1. Blocking issues  (🔴 will break / will not deliver)
2. Likely issues    (🟡 probable; what to verify)
3. Blind spots      (🔵 what the other judge might miss)
4. Verdict          (SHIP / FIX / KILL — one line + why)

Be concrete. Cite file/section. No filler, no apology.
Do not propose fixes. Only diagnose.
```

## Orchestrator synthesis

After both verdicts are sealed:

1. **Overlap → near-certain defects.** Every issue both judges flagged is treated as blocking until proven otherwise.
2. **Deltas → hypotheses.** A flag from only one judge is a hypothesis: verify it against the code before acting.
3. **Blind-spots field → meta.** The "what the other judge might miss" answers tell you where neither judge looked hard — often the real risk.
4. **Decision matrix:**

| Both say ship | Both say fix or kill | Split verdict |
|---|---|---|
| Go. | Block. Address before re-running Judgment Day. | The target is ambiguous. Rewrite the spec/design, not the review. |

5. **Record the verdict** in `session-notes` / `engram-integration` (see [`engram-integration`](../engram-integration/SKILL.md)) so the next session knows what was challenged and what survived.

## Rules

- **Independence is the entire point.** Collapsing to one judge gives you `code-reviewer` (see [`code-reviewer`](../code-reviewer/SKILL.md)) — that is fine, but it is not Judgment Day.
- **No fix proposals from judges.** Diagnosis only. Fixes are authored by the orchestrator in a fresh context after synthesis.
- **Same material, same prompt.** If you give judge 2 more context than judge 1, you have wasted the run.
- **Two is the minimum, not the maximum.** For high-stakes changes (auth, payments, migrations) use three judges: red, blue, and a **grey** judge who reads only the diff and asks "what is this even for?" — the dumb-question judge catches the obvious.
- **Cost is ~2× one review.** Worth it when the cost of being wrong is higher. Not worth it for cosmetic changes.
- **Run before implementation, not after.** Adversarial review of a 50-line spec is cheap; of a 5000-line diff is expensive. Move Judgment Day left.

## Relationship to other skills

- [`code-reviewer`](../code-reviewer/SKILL.md) — single-reviewer quality gate. Judgment Day is the two-reviewer escalation.
- [`dod-checker`](../dod-checker/SKILL.md) — the strict gatekeeper. Judgment Day feeds it evidence.
- [`parallelization`](../parallelization/SKILL.md) — the mechanics of running two agent sessions in parallel.
- [`kill-switches`](../kill-switches/SKILL.md) — if both judges say kill, the kill switch trips.
- [`professional-planner`](../professional-planner/SKILL.md) — Judgment Day is a phase gate inside SDD.

## Example: judging a design doc

```
Target: checkout-payment-service design doc (v3)
Material: 1 design doc, ~300 lines

Judge Red verdict:
  1. 🔴 No idempotency key on /charge — retries double-bill under network blip.
  2. 🟡 BCV rate cached 5 min; a devaluation event mid-cache overcharges.
  3. 🔵 Blue will not notice there is no dead-letter queue for Cashea webhooks.
  4. KILL — fix (1) before anything else.

Judge Blue verdict:
  1. 🔴 Refund flow is not specified — only charge flow. Half the requirement is missing.
  2. 🟡 No requirement covering partial refunds. Will rework in a week.
  3. 🔻 Red will not notice the errors section is copy-pasted from another doc.
  4. FIX — spec is half-written.

Orchestrator synthesis:
  Overlap: none — different stances caught different halves.
  Delta: Red's (1) double-bill is concrete — block.  Blue's (1) refund flow is a spec gap — block.
  Blind spot: Red predicted Blue would miss DLQ; Blue actually missed it too — DLQ is real risk.
  Decision: BLOCK. Rewrite spec with refund flow + idempotency key. Re-run Judgment Day.
```

## Keywords
judgment day, adversarial review, parallel review, two judges, red team blue team, spec challenge, design challenge, merge gate, independent verdict