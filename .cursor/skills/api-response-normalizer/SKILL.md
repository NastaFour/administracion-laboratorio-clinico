---
name: api-response-normalizer
description: Patterns to unify API response shapes across different endpoints (raw SQL vs Prisma, nested vs flat IDs). Defines the { data, meta, error } envelope convention, ID consistency rules, and helper function patterns for accessing fields that may be nested or flat. Use when designing endpoints, debugging "barber not found" errors, or fixing data shape mismatches between frontend and backend.
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires Node 20+."
metadata:
  trigger: ["data shape mismatch", "barber not found", "id mismatch", "response envelope", "api normalization", "barber.profile", "object object", "data shape", "response shape", "ID consistency"]
  scope: [global, project]
  version: "1.0.0"
allowed-tools: Bash(node:*) Read
---

# 📐 API Response Normalizer

Unifies data shapes across API endpoints. Prevents bugs where the frontend accesses `barber.profile?.rating` but the API returns a flat UserProfile with `user` nested, or where `barber.id` (UserProfile ID) is sent but the backend filters by `userId` (User ID).

## 📋 When to Use

- Use when designing a new endpoint that returns entity data
- Use when frontend shows "barber not found" after clicking a list item
- Use when data appears but fields are empty/undefined (shape mismatch)
- Use when images show `[object Object]` (string[] vs object[] mismatch)
- Do NOT use for auth token handling (use `auth-flow-audit`)

## 🚦 Hard Rules

- **Always** wrap responses in `{ data: T, meta?: {...}, error?: {...} }` envelope
- **Always** make endpoint `/:id` filter by that exact ID field, not a related field
- **Always** use helper functions for fields that may be nested or flat
- **Never** return raw Prisma objects without shaping (relations cause surprises)
- **Never** assume a field is a scalar when Prisma returns a relation object

## 🛠️ Workflow

1. Consult the envelope convention: [envelope-convention.md](references/envelope-convention.md)
2. Run the ID consistency checker:
   ```bash
   node ./.opencode/skills/api-response-normalizer/scripts/check-id-consistency.mjs
   ```
3. Fix any ID mismatch (e.g., `req.params.id` used in `where: { userId: id }`)
4. Apply helper functions for nested/flat field access

## 📚 References

- [Envelope Convention](references/envelope-convention.md) — response shape + ID rules + helpers
- [`prisma-frontend-types`](../prisma-frontend-types/SKILL.md) — Prisma model → TS type mapping
- [`api-design`](../api-design/SKILL.md) — REST URL conventions
- [`frontend-debugging-protocol`](../frontend-debugging-protocol/SKILL.md) — data shape diagnosis
