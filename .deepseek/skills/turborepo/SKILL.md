---
name: turborepo
description: Configures Turborepo for build caching and parallel execution in pnpm monorepos. Use when setting up incremental builds, running tasks across packages, or optimizing CI pipeline speed with remote caching.
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires Node 20+ and pnpm 9+."
allowed-tools: Bash(node:*) Read
metadata:
  trigger: ["turborepo", "turbo", "build cache", "parallel build", "incremental build", "turbo run", "turbo prune"]
  scope: [global, project]
  version: "1.0.0"
---

# ⚡ Turborepo — Build Caching & Parallel Execution

Use this skill when configuring Turborepo for monorepo task orchestration, build caching, or CI optimization.

## 📋 When to Use

- Use when setting up `turbo.json` pipeline configuration
- Use when running `turbo run build/test/lint` across packages
- Use when configuring remote caching (Vercel, custom S3)
- Do NOT use for simple single-package projects (pnpm scripts suffice)

## 🚦 Hard Rules

- **Always** define `turbo.json` at repo root with explicit `pipeline` for `build`, `test`, `lint`
- **Always** use `dependsOn: ["^build"]` for tasks that depend on upstream packages
- **Always** declare `outputs` for cacheable tasks (build artifacts)
- **Never** cache `dev` or `start` commands (non-deterministic)
- **Never** commit `.turbo/` cache directory

## 🛠️ Setup

```bash
pnpm add -Dw turbo
```

`turbo.json` at repo root:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"]
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": []
    },
    "lint": {
      "outputs": []
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

## 🚀 Common Commands

| Intent | Command |
|---|---|
| Build all packages (cached) | `pnpm turbo run build` |
| Build only changed packages | `pnpm turbo run build --filter=...[HEAD^1]` |
| Build specific package + deps | `pnpm turbo run build --filter=@org/api...` |
| Test parallel | `pnpm turbo run test --concurrency=4` |
| Prune for Docker | `pnpm turbo prune @org/api --docker` |
| Clear local cache | `rm -rf .turbo` |
| Remote cache (Vercel) | `pnpm turbo login && pnpm turbo link` |

## 🏗️ Monorepo Layout with Turbo

```
my-monorepo/
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
├── apps/
│   ├── api/          → build, test
│   └── web/          → build, test
└── packages/
    ├── db/           → build (prisma generate)
    ├── ui/           → build (tsup/rollup)
    └── config/       → (no build needed)
```

## 🐞 Common Pitfalls

- **Cache miss on CI** → ensure `turbo` is installed in CI and `.turbo/` is not in `.gitignore` (it should be, but CI should have its own cache layer)
- **Stale cache after schema change** → add `schema.prisma` to `inputs` in the `build` task
- **Parallel race condition** → use `dependsOn: ["^build"]` to enforce topological order

## 📚 References

- [Turborepo docs](https://turbo.build)
- [pnpm + Turborepo guide](https://turbo.build/repo/docs)
- [Remote caching](https://turbo.build/repo/docs/core-concepts/remote-caching)
