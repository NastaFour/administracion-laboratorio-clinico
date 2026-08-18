---
name: forms-validation-react
description: Patterns for form validation using React Hook Form + Zod with shared schemas in packages/shared-types. Covers base RHF+Zod pattern, multi-step wizard forms, and shared schema conventions for web and mobile. Use when creating login, register, booking, review, or profile edit forms.
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires Node 20+."
metadata:
  trigger: ["form validation", "react hook form", "rhf", "zod resolver", "form schema", "multi step form", "wizard form", "login form", "register form", "booking form", "shared schema"]
  scope: [global, project]
  version: "1.0.0"
allowed-tools: Bash(node:*) Read
---

# 📝 Forms Validation (React + Zod)

Patterns for form validation with React Hook Form + Zod. Uses shared schemas from `packages/shared-types` so web and mobile validate identically.

## 📋 When to Use

- Use when creating any form (login, register, booking, review, profile)
- Use when implementing multi-step wizard forms
- Use when sharing validation logic between web and mobile
- Do NOT use for simple toggle/checkbox state (no validation needed)

## 🚦 Hard Rules

- **Always** use `zodResolver` from `@hookform/resolvers/zod` with RHF
- **Always** define schemas in `packages/shared-types/src/schemas/` (not inline)
- **Never** duplicate validation logic between frontend and backend (share schemas)
- **Always** disable submit button while `isSubmitting` (prevent double submit)
- **Always** display inline errors under each field + error summary for accessibility

## 🛠️ Workflow

1. Read the base RHF+Zod pattern: [rhf-zod-pattern.md](references/rhf-zod-pattern.md)
2. Read multi-step forms: [multi-step-forms.md](references/multi-step-forms.md)
3. Read shared schema convention: [shared-schemas.md](references/shared-schemas.md)
4. Run the checker to verify forms use zodResolver + shared schemas:
   ```bash
   node ./.opencode/skills/forms-validation-react/scripts/check-forms.mjs
   ```

## 📚 References

- [RHF + Zod Pattern](references/rhf-zod-pattern.md) — base form pattern
- [Multi-Step Forms](references/multi-step-forms.md) — wizard with per-step validation
- [Shared Schemas](references/shared-schemas.md) — schema convention in shared-types
- [`react-vite`](../react-vite/SKILL.md) — web form components
- [`react-native`](../react-native/SKILL.md) — mobile form components
- [`prisma-frontend-types`](../prisma-frontend-types/SKILL.md) — field type mapping
