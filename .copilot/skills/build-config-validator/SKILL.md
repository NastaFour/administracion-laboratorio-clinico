---
name: build-config-validator
description: Validates that build config files (postcss.config, tailwind.config with DEFAULT shades, vite.config, tsconfig) exist and are correctly configured in the monorepo. Use when setting up a new web app, debugging "CSS not loading", or before running pnpm dev/build to catch silent misconfigurations early.
license: MIT
compatibility: "Requires Node 20+ and pnpm 9+. No external dependencies."
metadata:
  trigger: ["build config", "postcss missing", "tailwind DEFAULT", "vite config", "css not loading", "config validator"]
  scope: [global, project]
  version: "1.0.0"
allowed-tools: Bash(node:*) Read
---

# 🛠️ Build Config Validator

Verifies that build configuration files exist and are correctly structured before running `pnpm dev` or `pnpm build`. Prevents the silent failure where Tailwind is installed but `@tailwind` directives never get processed because `postcss.config.js` is missing.

## 📋 When to Use

- Use when a web app renders without CSS (plain text on one line)
- Use after cloning or scaffolding a new app in the monorepo
- Use before running `pnpm dev` or `pnpm build` for the first time
- Use when Tailwind utility classes (`bg-primary`, `text-primary`) don't apply color
- Do NOT use for mobile (Expo) — Metro config is different, use `expo-production-auditor`

## 🚦 Hard Rules

- **Always** `postcss.config.js` must exist with `tailwindcss` + `autoprefixer` plugins
- **Always** each Tailwind color palette must have a `DEFAULT` shade if used as `bg-primary` / `text-primary`
- **Always** `vite.config.ts` must exist with React plugin
- **Never** assume a config file exists just because the package is installed

## 🛠️ Workflow

1. Run the validator script:
   ```bash
   node ./.opencode/skills/build-config-validator/scripts/validate-build-config.mjs
   ```
2. If errors, review the missing/misconfigured file + suggested fix
3. Auto-fix missing files with `--fix` flag:
   ```bash
   node ./.opencode/skills/build-config-validator/scripts/validate-build-config.mjs --fix
   ```
4. Re-run without `--fix` to confirm all checks pass

## 🔍 What It Checks

| Check | File | Condition |
|---|---|---|
| postcss | `apps/web/postcss.config.{js,cjs,mjs}` | plugins include `tailwindcss` + `autoprefixer` |
| tailwind DEFAULT | `apps/web/tailwind.config.{js,cjs,ts}` | each palette used in `bg-<color>` has `DEFAULT` |
| tailwind border | `apps/web/tailwind.config.{js,cjs,ts}` | `border` color variable defined if used |
| vite | `apps/web/vite.config.{ts,js}` | exists with React plugin |
| tsconfig | `tsconfig.base.json` | exists with `strict: true` |

## 📚 References

- [`tailwindcss`](../tailwindcss/SKILL.md) — Tailwind config standards
- [`react-vite`](../react-vite/SKILL.md) — Vite config for Admin Panel
- [`frontend-debugging-protocol`](../frontend-debugging-protocol/SKILL.md) — diagnostic tree for "CSS not loading"
