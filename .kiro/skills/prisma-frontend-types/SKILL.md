---
name: prisma-frontend-types
description: Maps Prisma models to frontend-safe TypeScript types to prevent shape mismatches like treating UserGallery[] (objects) as string[]. Includes type mapping rules (DateTime to ISO string, Json to unknown+Zod, relations to typed arrays) and a generator script. Use when consuming Prisma-based API endpoints in the frontend or when frontend shows [object Object] for relation fields.
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires Node 20+."
metadata:
  trigger: ["prisma type", "frontend type", "object object", "gallery string", "type mapping", "shared types", "prisma frontend", "relation type"]
  scope: [global, project]
  version: "1.0.0"
allowed-tools: Bash(node:*) Read
---

# 🔄 Prisma → Frontend Types

Maps Prisma models to frontend-safe TypeScript types. Prevents bug #6 where `UserGallery[]` (objects `{id, imageUrl, caption}`) was treated as `string[]` by the frontend, causing `[object Object]` in images.

## 📋 When to Use

- Use when consuming an API endpoint that returns Prisma models with relations
- Use when frontend shows `[object Object]` for a field that should be a string
- Use when generating types for `packages/shared-types`
- Do NOT use for backend Prisma client types (use `prisma-orm` skill)

## 🚦 Hard Rules

- **Never** use `string[]` for a Prisma relation field — always use the typed object array
- **Always** map `DateTime` to `string` (ISO 8601) for frontend types
- **Always** map `Json` to `unknown` + validate with Zod at runtime (never `any`)
- **Always** map Prisma enums to TS union types of string literals
- **Never** expose soft-delete fields (`deletedAt`) in public response types

## 🛠️ Workflow

1. Consult the type mapping rules: [type-mapping-rules.md](references/type-mapping-rules.md)
2. Generate types from schema.prisma:
   ```bash
   node ./.opencode/skills/prisma-frontend-types/scripts/generate-frontend-types.mjs
   ```
3. Import generated types in `packages/shared-types` and frontend components
4. Run `pnpm --filter @scope/web typecheck` to verify

## 📚 References

- [Type Mapping Rules](references/type-mapping-rules.md) — Prisma → TS mapping table
- [`prisma-orm`](../prisma-orm/SKILL.md) — backend Prisma usage
- [`api-response-normalizer`](../api-response-normalizer/SKILL.md) — response envelope
- [`typescript`](../typescript/SKILL.md) — strict TS guidelines
