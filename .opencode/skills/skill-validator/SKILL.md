---
name: skill-validator
description: Validates that all SKILL.md files in the catalog comply with the agentskills.io specification. Checks name constraints, description length, frontmatter structure, and folder-name matching. Exits non-zero on any failure. Use in pre-commit hooks, CI pipelines, or before publishing a skill catalog.
license: MIT
compatibility: Requires Node 20+ and pnpm 9+. No external dependencies.
metadata:
  trigger: ["validar skills", "validate skills", "check spec", "skill lint", "spec compliance"]
  scope: [root-only]
  version: "1.0.0"
allowed-tools: Bash(node:*) Read
---

# ✅ Skill Validator

Run `scripts/validate-skills.mjs` (in this folder) to check the entire catalog against the agentskills.io spec.

## 🚦 Checks Performed

| Check | Severity | Rule |
|---|---|---|
| Frontmatter exists | Error | File must start with `---\n` and end frontmatter with `---\n` |
| `name` field present | Error | Required field |
| `name` regex | Error | Must match `^[a-z0-9-]+$` |
| `name` length | Error | 1-64 characters |
| `name` no leading hyphen | Error | Cannot start with `-` |
| `name` no trailing hyphen | Error | Cannot end with `-` |
| `name` no consecutive hyphens | Error | No `--` |
| `name` matches folder | Error | Parent directory name must equal `name` |
| `description` present | Error | Required field |
| `description` length | Error | 1-1024 characters |
| `description` content | Warning | Should describe both "what" and "when" |
| `license` (if set) | Info | Recommended |
| `compatibility` length | Error | Max 500 characters if set |
| `metadata` (if set) | Info | Recommended for trigger/scope |
| No `npm` mentions | Warning | Use `pnpm` instead |
| No `npx` mentions | Warning | Use `pnpm dlx` instead |
| No `any` in code | Warning | Use `unknown` + narrowing |
| No LocalStorage for tokens | Warning | Use memory + HTTP-only cookies |

## 🚀 Usage

From the catalog root:

```bash
# Validate all skills
node ./00-meta-skills/skill-validator/scripts/validate-skills.mjs

# Validate specific folder
node ./00-meta-skills/skill-validator/scripts/validate-skills.mjs ./01-planning-process

# JSON output (for CI)
node ./00-meta-skills/skill-validator/scripts/validate-skills.mjs --json

# Strict mode (warnings become errors)
node ./00-meta-skills/skill-validator/scripts/validate-skills.mjs --strict
```

## 📊 Exit Codes

| Code | Meaning |
|---|---|
| `0` | All checks pass (or only warnings) |
| `1` | One or more errors found |
| `2` | Invalid arguments |

## 🛠️ CI Integration

Add to `.github/workflows/validate-skills.yml`:

```yaml
name: Validate Skills
on: [push, pull_request]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: node ./00-meta-skills/skill-validator/scripts/validate-skills.mjs --strict
```

## 🔄 Related Meta-Skills

- `skill-creator` — create new skills with built-in validation
- `skill-sync` — install skills to other tools
