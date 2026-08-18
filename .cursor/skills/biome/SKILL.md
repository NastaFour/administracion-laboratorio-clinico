---
name: biome
description: Configures Biome as a unified linter and formatter replacing ESLint + Prettier. Use when setting up code quality tooling, configuring lint rules, or migrating from ESLint/Prettier to Biome in a pnpm monorepo.
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires Node 20+ and pnpm 9+."
allowed-tools: Bash(node:*) Read
metadata:
  trigger: ["biome", "linter", "formatter", "eslint", "prettier", "code style", "linting"]
  scope: [global, project]
  version: "1.0.0"
---

# 🔧 Biome — Unified Linting + Formatting

Use this skill when configuring Biome for code quality, or migrating from ESLint + Prettier to a single tool.

## 📋 When to Use

- Use when setting up `biome.json` configuration
- Use when running `pnpm biome check` or `pnpm biome format`
- Use when migrating from ESLint + Prettier to Biome
- Do NOT use if the project already has a working ESLint setup that you don't want to change

## 🚦 Hard Rules

- **Always** use `biome.json` at repo root for shared config
- **Always** run `pnpm biome check` before committing (add to pre-commit hook)
- **Never** mix Biome and ESLint on the same files (pick one)
- **Never** use Biome for type checking (use `tsc --noEmit` instead)

## 🛠️ Setup

```bash
pnpm add -Dw @biomejs/biome
pnpm biome init
```

`biome.json` at repo root:

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "vcs": { "enabled": true, "clientKind": "git", "useIgnoreFile": true },
  "organizeImports": { "enabled": true },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "correctness": {
        "noUnusedImports": "warn",
        "noUnusedVariables": "warn"
      },
      "style": {
        "noNonNullAssertion": "warn"
      }
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  }
}
```

## 🚀 Common Commands

| Intent | Command |
|---|---|
| Check (lint + format) | `pnpm biome check .` |
| Fix auto-fixable | `pnpm biome check --write .` |
| Format only | `pnpm biome format --write .` |
| Lint only | `pnpm biome lint .` |
| Check single file | `pnpm biome check src/lib/api.ts` |
| CI check (no write) | `pnpm biome ci .` |

## 🔄 Migration from ESLint + Prettier

```bash
# 1. Install Biome
pnpm add -Dw @biomejs/biome

# 2. Migrate rules (reads .eslintrc and .prettierrc)
pnpm biome migrate eslint --write
pnpm biome migrate prettier --write

# 3. Remove old deps
pnpm remove eslint prettier eslint-config-prettier eslint-plugin-react ...

# 4. Update CI to use biome ci instead of eslint + prettier --check
```

## 📚 References

- [Biome docs](https://biomejs.dev)
- [ESLint → Biome migration](https://biomejs.dev/guides/migrate-from-eslint-prettier/)
- [Rule reference](https://biomejs.dev/linter/rules/)
