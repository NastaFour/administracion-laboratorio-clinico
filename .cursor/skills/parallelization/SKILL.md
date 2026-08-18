---
name: parallelization
description: Manages parallel AI agent instances using git worktrees, cascade patterns, and two-instance scaffolding. Use when running multiple agents concurrently on the same repo, splitting research from implementation, or scaling feature development across sessions.
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires Node 20+ and pnpm 9+."
allowed-tools: Bash(node:*) Read
metadata:
  trigger: ["parallel", "worktree", "fork", "cascade", "multi-agent", "parallel instance", "scaffolding", "two instances"]
  scope: [global, project]
  version: "1.0.0"
---

# 🔀 Parallelization — Multi-Agent Workflow (ECC Pattern)

Inspired by [ECC's longform guide](https://github.com/affaan-m/ECC/blob/main/the-longform-guide.md). When a single agent isn't enough, run multiple instances concurrently on the same repo using git worktrees.

## 📋 When to Use

- Use when you need to run research AND implementation in parallel
- Use when you have multiple independent features that can be built simultaneously
- Use when a single agent hits context limits mid-feature
- Do NOT use when features overlap in the same files (conflict guaranteed)

## 🚦 Hard Rules

- **Always** use `git worktree` for parallel instances — NEVER two terminals in the same directory
- **Always** define scope boundaries BEFORE forking (which files each instance touches)
- **Always** name your agent sessions with `/rename` for traceability
- **Never** run parallel instances that modify the same files
- **Never** merge parallel branches without a fresh-context review first

## 🛠️ Git Worktrees for Parallel Instances

```bash
# 1. Create worktrees for each parallel task
git worktree add ../project-feature-a feature-a
git worktree add ../project-feature-b feature-b
git worktree add ../project-refactor refactor-branch

# 2. Open agents in each worktree
cd ../project-feature-a && opencode    # Terminal 1: Feature A
cd ../project-feature-b && opencode    # Terminal 2: Feature B
cd ../project-refactor && opencode     # Terminal 3: Refactor

# 3. Name your sessions
# Claude Code: /rename "Feature A — Payment Integration"
# OpenCode: /rename "Feature B — Inventory Grid"

# 4. Cleanup when done
git worktree remove ../project-feature-a
git worktree remove ../project-feature-b
```

## 🔄 The Two-Instance Kickoff Pattern (ECC)

Start every new project or large feature with 2 instances:

### Instance 1: Scaffolding Agent
```
Role: Scaffold the project structure
- Creates project structure (monorepo layout)
- Sets up configs (AGENTS.md, pnpm-workspace.yaml, turbo.json)
- Installs skills via `install-skills.mjs`
- Sets up CI/CD stubs
- Output: scaffold.md
```

### Instance 2: Deep Research Agent
```
Role: Research the problem space
- Connects to web search for current best practices
- Creates the PRD (Product Requirements Document)
- Creates architecture diagrams (Mermaid)
- Compiles references with actual documentation clips
- Output: research.md + prd.md
```

```bash
# Kickoff pattern
git worktree add ../project-scaffold scaffold
git worktree add ../project-research research

# Terminal 1 (left): scaffolding
cd ../project-scaffold && codex --prompt "Scaffold this monorepo with pnpm + turborepo"

# Terminal 2 (right): research
cd ../project-research && codex --prompt "Research the problem space for <feature> and create PRD"
```

## 🏃‍♂️ The Cascade Method

When running 3+ instances, organize with a left-to-right cascade:

```
Terminal 1 → Terminal 2 → Terminal 3 → Terminal 4
 Task A       Task B       Task C       Task D
 (oldest)                              (newest)

Sweep direction: LEFT → RIGHT
Close oldest first, keep newest for active work
Max 3-4 tasks at a time
```

## 📐 Minimum Overlap Rule

Before forking:

1. **List all files** each agent will modify
2. **Check for overlap** between instances
3. **If overlap**: merge the tasks into one instance — don't fork
4. **If no overlap**: fork and run in parallel

```
Instance 1 scope:  apps/api/routes/orders.ts, apps/api/middleware/auth.ts
Instance 2 scope:  apps/web/components/Inventory.tsx, apps/web/hooks/useInventory.ts
                    → No overlap → SAFE TO FORK ✓

Instance 1 scope:  apps/api/routes/orders.ts, apps/api/middleware/auth.ts
Instance 2 scope:  apps/api/middleware/auth.ts, apps/api/socket/delivery.ts
                    → Overlap on auth.ts → MERGE, DO NOT FORK ✗
```

## 🔗 Integration with Other Skills

| Use Case | Skills to Invoke |
|---|---|
| Before parallel work | `02-dev-roles/security-audit` (ensure sandboxing) |
| After parallel merge | `02-dev-roles/code-reviewer` (fresh context review) |
| Scaffolding instance | `06-code-quality/pnpm-workspaces`, `06-code-quality/turborepo` |
| Research instance | `03-ai-ml/research-first` |
| Session tracking across instances | `01-planning-process/session-notes` |
| Process monitoring | `08-devops/kill-switches` (heartbeat for unattended) |

## 📚 References

- [ECC Longform Guide — Parallelization](https://github.com/affaan-m/ECC/blob/main/the-longform-guide.md)
- [Git Worktree Docs](https://git-scm.com/docs/git-worktree)
- `01-planning-process/session-notes/SKILL.md` — Session state preservation
- `08-devops/kill-switches/SKILL.md` — Safe process termination
