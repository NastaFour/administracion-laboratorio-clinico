---
name: auth-flow-audit
description: Audits end-to-end consistency of the auth flow: store, App.tsx, API, cookies, and axios interceptors. Detects anti-patterns like access tokens in localStorage, setToken without getMe, and 401 interceptors that redirect on public pages. Use when implementing or debugging login, register, session refresh, or redirect loops.
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires Node 20+."
metadata:
  trigger: ["auth audit", "login no persiste", "401 redirect", "token en localStorage", "interceptor redirect", "getMe loop", "auth flow", "cookie token", "session check"]
  scope: [global, project]
  version: "1.0.0"
allowed-tools: Bash(node:*) Read
---

# 🔐 Auth Flow Audit

Audits consistency between the auth store, App.tsx, the API, and cookies/tokens. Prevents bugs where login "appears successful" but doesn't persist, or where 401 interceptors break public pages.

## 📋 When to Use

- Use when login appears successful but user isn't authenticated on next page load
- Use when unauthenticated users can't see public pages (redirect loop)
- Use when implementing or modifying auth store, interceptors, or session refresh
- Use when migrating from localStorage tokens to httpOnly cookies
- Do NOT use for password hashing or JWT structure (use `jwt-bcrypt`)

## 🚦 Hard Rules

- **Never** store access tokens in localStorage or sessionStorage (memory only)
- **Never** store refresh tokens in localStorage (HTTP-only cookies only)
- **Always** call `getMe()` on App mount to restore session from cookie
- **Never** redirect to `/login` automatically in axios 401 interceptor
- **Always** let each page handle 401 individually

## 🛠️ Workflow

1. Run the audit script to detect anti-patterns:
   ```bash
   node ./.opencode/skills/auth-flow-audit/scripts/audit-auth.mjs
   ```
2. Review the audit checklist for manual checks: [audit-checklist.md](references/audit-checklist.md)
3. Fix each anti-pattern found
4. Re-run the script to confirm clean

## 📚 References

- [Audit Checklist](references/audit-checklist.md) — 10+ manual checks by category
- [`jwt-bcrypt`](../jwt-bcrypt/SKILL.md) — token security standards
- [`frontend-debugging-protocol`](../frontend-debugging-protocol/SKILL.md) — redirect loop diagnosis
