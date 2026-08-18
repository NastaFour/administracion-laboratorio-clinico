---
name: skill-sync
description: Distributes skills from this catalog to multiple AI agent configurations using cross-platform file operations (copy, symlink, junction). Detects which tools are installed on the host and creates the right folder structure for each. Use when installing skills into a new project or syncing updates across tools.
license: MIT
compatibility: Requires Node 20+ and pnpm 9+. Cross-platform (Windows, macOS, Linux). No MCP required.
metadata:
  trigger: ["sync skills", "instalar skills", "distribuir skills", "deploy skills", "share skills"]
  scope: [root-only]
  version: "1.0.0"
allowed-tools: Bash(node:*) Bash(mkdir:*) Bash(cp:*) Bash(mklink:*) Read Write Edit
---

# 🔄 Skill Sync (Cross-Tool Distribution)

Use this meta-skill (or the `scripts/install-skills.mjs` script in this folder) to install skills from this catalog into any project for any supported agent.

## 🎯 Supported Agents

The script auto-detects which of these are present and installs skills accordingly:

| Agent | Detection path | Install path |
|---|---|---|
| Claude Code | `~/.claude/` or `claude` on PATH | `~/.claude/skills/` |
| OpenCode | `~/.config/opencode/` or `opencode` on PATH | `~/.config/opencode/skills/` |
| Cursor | `~/.cursor/` | `~/.cursor/skills/` |
| Copilot (VS Code) | `~/.copilot/` or VS Code user profile | `~/.copilot/skills/` |
| Codex | `~/.codex/` or `codex` on PATH | `~/.codex/skills/` |
| Gemini CLI | `~/.gemini/` or `gemini` on PATH | `~/.gemini/skills/` |
| Antigravity | `~/.gemini/antigravity/` | `~/.gemini/antigravity/skills/` |
| Kiro | `~/.kiro/` or `kiro` on PATH | `~/.kiro/skills/` |
| Windsurf | `~/.codeium/windsurf/` | `~/.codeium/windsurf/skills/` |

## 🚀 Quick Start

From the catalog root:

```bash
# Install globally to all detected agents
node ./00-meta-skills/skill-sync/scripts/install-skills.mjs

# Install into a specific project (project-local)
node ./00-meta-skills/skill-sync/scripts/install-skills.mjs --target "C:\path\to\project"

# Install only specific categories
node ./00-meta-skills/skill-sync/scripts/install-skills.mjs --only "04-backend,05-frontend"

# Symlink mode (single source of truth, no duplication)
node ./00-meta-skills/skill-sync/scripts/install-skills.mjs --symlink

# Preview changes without writing
node ./00-meta-skills/skill-sync/scripts/install-skills.mjs --dry-run
```

## 🪟 Windows Notes

The script uses Node's `fs.symlinkSync` with `type: 'junction'` on Windows. This works without admin privileges. Falls back to recursive copy if junction creation fails (e.g., on FAT32 or network drives).

## 🔁 Sync Strategies

### Strategy 1: Copy (default)
- Each tool gets its own copy of the SKILL.md
- Pros: tools can't see each other, easy to customize per-tool
- Cons: must re-run sync to update

### Strategy 2: Symlink (`--symlink`)
- All tools point to the same files in the catalog
- Pros: single source of truth, changes propagate instantly
- Cons: renaming a tool folder breaks the link

### Strategy 3: Project-local
- Installs to `<project>/.claude/skills/`, `<project>/.cursor/skills/`, etc.
- Use when working in a project repo, not on a global catalog

## 📋 What the Script Does

1. Reads `SKILLS.md` to get the list of all skills
2. Detects which target agents are available
3. For each skill:
   - Creates `<target>/<skill-name>/` directory
   - Copies or symlinks `SKILL.md` and any `references/`, `scripts/`, `assets/`
4. Prints a summary table of installed skills per target

## 🚫 What's NOT Covered

- MCP server configuration (this catalog has no MCP integration by design — see AGENTS.md)
- Per-agent prompt customization (use agent-specific config files)
- Updating skills in tools that are not running (you must restart the tool to re-read skills)

## 🔄 Related Meta-Skills

- `skill-creator` — create new skills
- `skill-validator` — verify spec compliance
