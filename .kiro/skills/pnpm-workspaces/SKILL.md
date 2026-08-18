---
name: pnpm-workspaces
description: Configures pnpm as the package manager and workspace orchestrator for monorepo projects. Enforces pnpm-workspace.yaml, .npmrc, lockfile hygiene, and filter/parallel commands for multi-package workflows. Use when initializing, migrating from legacy package managers, or operating workspaces.
license: MIT
compatibility: Requires Node 20+ and pnpm 9+. Works in any monorepo with TypeScript.
metadata:
  trigger: ["pnpm", "workspaces", "monorepo", "package manager"]
  scope: [global, project]
  version: "2.0.0"
allowed-tools: Read Edit Write Bash(pnpm:*) Bash(node:*) Bash(git:*)
---

# 📦 pnpm Workspaces

Use this skill for any monorepo using pnpm as the package manager. Replaces legacy workspace configurations.

## 🚨 Hard Rules
- **Always** use `pnpm` for install, add, run, and exec. Never call legacy package-manager commands directly.

- For one-off binaries, use `pnpm dlx <pkg>` (replaces the legacy one-off runner).
- For local binaries in the workspace, use `pnpm exec <bin>` or `pnpm <bin>`.
- Commit `pnpm-lock.yaml`. Never edit it by hand. Use `pnpm install --frozen-lockfile` in CI.
- `node_modules` is workspace-local. Cross-package imports are forbidden; depend via `workspace:*` protocol.

## 🗂️ Initial Setup

```bash
# Install pnpm globally (or use corepack)
corepack enable
corepack prepare pnpm@latest --activate

# Initialize in a fresh monorepo
pnpm init
```

Create `pnpm-workspace.yaml` at repo root:

```yaml
packages:
  - "apps/*"
  - "packages/*"
  - "services/*"
```

Create `.npmrc` at repo root to enforce consistent behavior:

```ini
# Strict and predictable
auto-install-peers=true
strict-peer-dependencies=false
shamefully-hoist=false
prefer-workspace-packages=true
link-workspace-packages=true
save-workspace-protocol=rolling
```

## 🛠️ Common Commands

| Intent | Command | Notes |
|---|---|---|
| Install all deps | `pnpm install` | Reads `pnpm-lock.yaml` |
| Add dep to a package | `pnpm --filter <pkg> add <dep>` | `--filter` = scope |
| Add dev dep | `pnpm --filter <pkg> add -D <dep>` | |
| Add workspace dep | `pnpm --filter <pkg> add <other>@workspace:*` | Uses `workspace:*` |
| Remove dep | `pnpm --filter <pkg> remove <dep>` | |
| Run script in one pkg | `pnpm --filter <pkg> <script>` | |
| Run script in all | `pnpm -r <script>` | `-r` = recursive |
| Run in parallel | `pnpm -r --parallel <script>` | |
| Run in topological order | `pnpm -r --topological <script>` | Default for builds |
| One-off binary | `pnpm dlx <pkg>` | Replaces the legacy one-off runner |
| Local binary | `pnpm exec <bin>` | Replaces the legacy local-runner |
| Update all | `pnpm update --recursive --latest` | |
| Audit | `pnpm audit --prod` | |

## 🔁 Migration from legacy workspaces

When inheriting a legacy `npm`-style workspaces project:

```bash
# 1. Remove old artifacts
rm -rf node_modules package-lock.json

# 2. Remove workspaces key from root package.json
# 3. Add pnpm-workspace.yaml (see above)
# 4. Replace all legacy package-manager commands → `pnpm` equivalents in scripts
# 5. Convert deps in package.json:
#    "@org/utils": "*"  →  "@org/utils": "workspace:*"
# 6. Install
pnpm install
```

## 🏗️ Monorepo Layout (TypeScript)

```
my-monorepo/
├── pnpm-workspace.yaml
├── package.json
├── pnpm-lock.yaml
├── .npmrc
├── tsconfig.base.json
├── apps/
│   ├── api/
│   │   ├── package.json
│   │   └── tsconfig.json (extends ../../tsconfig.base.json)
│   └── web/
└── packages/
    ├── db/
    ├── ui/
    └── config/
```

Each `package.json` declares its name as `@org/<name>` and uses `"main"` / `"types"` for inter-package imports.

## 🧪 Workspace Dependencies

```jsonc
// apps/api/package.json
{
  "name": "@org/api",
  "dependencies": {
    "@org/db": "workspace:*",
    "@org/config": "workspace:*",
    "express": "^4.19.0"
  }
}
```

## 🐞 Common Pitfalls

- **"Module not found" after install** → run `pnpm install` again, then restart TS server.
- **Peer dep warnings** → set `auto-install-peers=true` in `.npmrc`.
- **Phantom dependencies** → avoid `shamefully-hoist=true`; use `workspace:*` explicitly.
- **CI cache misses** → use `pnpm install --frozen-lockfile` and cache `~/.local/share/pnpm/store`.

## 📚 References

- [pnpm official docs](https://pnpm.io)
- [pnpm workspaces guide](https://pnpm.io/workspaces)
- [Corepack](https://nodejs.org/api/corepack.html)
