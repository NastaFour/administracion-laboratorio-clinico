---
name: changesets
description: Configures Changesets for versioning and changelog management in pnpm monorepos. Use when managing releases, creating changesets for PRs, or publishing packages to the public registry.
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires Node 20+ and pnpm 9+."
allowed-tools: Bash(node:*) Read
metadata:
  trigger: ["changesets", "versioning", "changelog", "release", "publish", "semver", "registry publish"]
  scope: [global, project]
  version: "1.0.0"
---

# 📦 Changesets — Versioning & Release Management

Use this skill when managing package versions, generating changelogs, or publishing releases in a pnpm monorepo.

## 📋 When to Use

- Use when creating a changeset for a PR (`pnpm changeset`)
- Use when bumping versions and generating changelogs (`pnpm changeset version`)
- Use when publishing packages to the public registry (`pnpm changeset publish`)
- Do NOT use for single-package projects without versioning needs

## 🚦 Hard Rules

- **Always** create a changeset before merging a PR that changes package behavior
- **Always** use semantic versioning: `patch` for fixes, `minor` for features, `major` for breaking changes
- **Always** write clear changeset summaries (they become the changelog entry)
- **Never** skip changesets for public-facing packages
- **Never** publish without running `pnpm changeset version` first

## 🛠️ Setup

```bash
pnpm add -Dw @changesets/cli
pnpm changeset init
```

`.changeset/config.json`:

```json
{
  "$schema": "https://unpkg.com/@changesets/config/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "restricted",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": []
}
```

## 🚀 Common Commands

| Intent | Command |
|---|---|
| Create changeset | `pnpm changeset` |
| Version bump + changelog | `pnpm changeset version` |
| Publish to the public registry | `pnpm changeset publish` |
| Status (pending changesets) | `pnpm changeset status` |
| Snapshot release | `pnpm changeset version --snapshot canary` |

## 🔄 Typical Workflow

```
1. Developer creates PR with code changes
2. Developer runs `pnpm changeset` and selects affected packages + semver bump
3. PR review includes changeset file review
4. After merge, CI runs `pnpm changeset version` to bump versions
5. CI publishes with `pnpm changeset publish`
```

## 📚 References

- [Changesets docs](https://github.com/changesets/changesets)
- [Adding a changeset](https://github.com/changesets/changesets/blob/main/docs/adding-a-changeset.md)
- [CI integration](https://github.com/changesets/changesets/blob/main/docs/automating-changesets.md)
