---
name: code-reviewer
description: Conduct a rigorous, professional-grade code review (Pull Request simulation) on new code. Enforces security guardrails, audits SOLID/DRY/KISS, and integrates ECC verification loops (checkpoint vs continuous evals). Use before committing, before PR creation, or during Phase 5-6 of SDD.
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires Node 20+ and pnpm 9+."
allowed-tools: Bash(node:*) Read
metadata:
  trigger: ["code reviewer", "review", "code review", "PR review", "verification loop", "audit code"]
  scope: [global, project]
  version: "2.0.0"
---

# 🔍 Code Reviewer & SOLID Auditor (v2 — ECC Patterns)

This skill acts as a strict but constructive Senior Peer Reviewer. Enhanced with ECC verification loop patterns.

---

## 🔄 ECC Verification Loops

ECC defines two review modes. Choose the right one:

| Mode | When | What |
|---|---|---|
| **Checkpoint Review** | End of phase, before commit, before PR | Full audit: all 5 dimensions, security checklist |
| **Continuous Review** | After each task/code batch | Quick scan: security + KISS + structure only |

### Fresh Context Rule (ECC Pattern)

For adversarial reviews (diffs, conflicts, PR readiness), the reviewer must have **fresh context** — not the same session that wrote the code. If the agent platform supports subagents, launch the reviewer as a subagent with a clean context window.

## ⚖️ The 4R Framework (structured review)

Run the four Rs in order. Every PR review should answer all four explicitly — see [`references/4r-framework.md`](references/4r-framework.md) for the full checklist.

| R | Question | What it catches |
|---|---|---|
| **Reverse-Engineer** | "What does this code actually do?" | Hidden bugs leaking through assumptions — the author's intent differs from what the code actually executes. Trace the runtime path, not the comments. |
| **Reason** | "Why is it written this way — and is the why still valid?" | Stale justifications, premature optimization, copy-paste from a different context. Ask the author (or git blame) for the original reason. |
| **Reuse** | "Where is this already solved in the codebase?" | DRY violations — duplicated helpers, parallel schemas, re-invented utilities. Before adding code, grep for an existing solution. |
| **Resolve** | "What is the smallest change that fixes the diagnosed issue?" | Over-engineering — reviewers proposing architecture rewrites for a missing null-check. Resolve the root cause, not the symptom.

Rules: diagnose before prescribing (R1-R3 must be answered before R4); never combine review with implementation in the same context — R4 outputs a recommendation, the author writes the fix.

## 🪝 Pre-commit automation via GGA (Gentleman Guardian Angel)

Automate this skill as a pre-commit hook with [`gga`](https://github.com/Gentleman-Programming/gentleman-guardian-angel) — provider-agnostic AI review. See [`references/pre-commit-gga.md`](references/pre-commit-gga.md) for setup.

```bash
brew install gentleman-programming/tap/gga        # or scoop on Windows
cd ~/your-project
gga init                                          # Create .gga config (set PROVIDER=claude|gemini|codex|opencode|ollama|lmstudio|github)
gga install                                       # Install pre-commit hook
```

Now every `git commit` is reviewed by an AI against your `AGENTS.md` before it lands. Cache skips unchanged files. `gga run --pr-mode` reviews full PRs; `gga run --ci` reviews last commit in CI/CD.

## 🧨 Adversarial escalation

Single-reviewer not enough for non-trivial changes? Escalate to [`judgment-day`](../judgment-day/SKILL.md) — two independent judges (red challenger + blue advocate) review the same target in parallel and surface what one reviewer is structurally blind to.

## 🏛️ Review Dimensions

You must evaluate the code across these 5 critical dimensions:

1. **Security (2026 Standards)**:
   - Verify that **NO** `.env` keys, passwords, or tokens are hardcoded.
   - Verify that JWT tokens are never stored in LocalStorage. Access tokens must be in-memory, and Refresh tokens must have `httpOnly: true, secure: true, sameSite: 'strict'` properties (see `../jwt-bcrypt/SKILL.md`).
   - Verify that all Socket.io emissions and callbacks validate their payloads via Zod (see `../socketio/SKILL.md`).
   - Check mobile data: verify that `expo-secure-store` is used for authentication credentials instead of AsyncStorage.
   - Ensure dynamic ports (`process.env.PORT`) are configured for Express.
   - For full security audit, invoke `../security-audit/SKILL.md`.

2. **SOLID & Clean Code (DRY/KISS)**:
   - **SRP Audit**: Check if components are bloated with mixed responsibilities. Verify hooks separation.
   - **DRY Audit**: Scan for duplicate code blocks (schema types, helper algorithms).
   - **KISS Audit**: Flag unnecessary dependencies, complex state trackers, or functions exceeding 40 lines.
   - Refer to `../solid-clean-code/SKILL.md`.

3. **Performance**: Spot bottlenecks (missing query indexes, N+1 Prisma relations, uncleaned Socket.io listeners, unoptimized FlatLists).
4. **Structure & Patterns**: Verify monorepo workspace conventions and SDD artifact consistency.
5. **Error Handling**: Verify async routes capture errors and return structured JSON logs via Pino/Winston.

---

## 📋 Feedback Format

For each dimension, report:
- **Status**: [✅ Pass / ⚠️ Needs Improvement / 🚨 Critical Issue]
- **Details**: What, where, and a snippet of how to fix it.

**Conclusion**:
- Provide an overall score (1-10) and a one-line summary.
- List the **Top 3 Highest-Impact Changes** the user should make immediately.

## 🔗 Integration with Other Skills

| Scenario | Also Invoke |
|---|---|
| Security-sensitive code | `02-dev-roles/security-audit/SKILL.md` |
| New library/dependency | `06-code-quality/dependency-guardian/SKILL.md` |
| Pre-production | `02-dev-roles/dod-checker/SKILL.md` |
| Post-bugfix | `02-dev-roles/expert-debugger/SKILL.md` |
| Performance concerns | `02-dev-roles/performance-refactor/SKILL.md` |

## 📚 References

- [ECC Verification Loops](https://github.com/affaan-m/ECC/blob/main/the-longform-guide.md)
- `../solid-clean-code/SKILL.md` — SOLID/DRY/KISS deep dive
- `../jwt-bcrypt/SKILL.md` — JWT security standards
- `../security-audit/SKILL.md` — Full security checklist
