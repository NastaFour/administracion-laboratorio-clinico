---
name: env-management
description: Manages environment variables across development, staging, and production environments. Covers .env files, validation of required variables, type-safe access, and secret rotation. Use when configuring environment variables, adding new env vars, or debugging env-related issues.
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires Node 20+ and pnpm 9+."
allowed-tools: Bash(node:*) Read
metadata:
  trigger: ["env", "environment variables", ".env", "dotenv", "secrets", "config", "API key"]
  scope: [global, project]
  version: "1.0.0"
---

# 🔐 Environment Variable Management

Use this skill when managing .env files, validating required variables, or debugging environment-related configuration.

## 📋 When to Use

- Use when adding new environment variables to the project
- Use when setting up .env files for a new environment
- Use when debugging "undefined" env var errors
- Do NOT use for runtime secret management (use a vault service)

## 🚦 Hard Rules

- **Always** commit `.env.example` with all required variables (no real values)
- **Always** validate env vars at startup with Zod or a validation library
- **Always** use `EXPO_PUBLIC_` prefix for Expo client-side env vars
- **Always** use `VITE_` prefix for Vite client-side env vars
- **Never** commit `.env`, `.env.local`, `.env.production` to git
- **Never** hardcode API keys, secrets, or database URLs in source code
- **Never** log env vars that contain secrets (API keys, tokens, passwords)

## 📁 File Structure

```
project-root/
├── .env.example          ← COMMITTED: all variables with placeholder values
├── .env                  ← GITIGNORED: local development values
├── .env.local            ← GITIGNORED: local overrides
├── .env.staging          ← GITIGNORED: staging values
├── .env.production       ← GITIGNORED: production values
└── .gitignore            ← must include .env*
```

## 🛠️ Validation at Startup (Zod)

```typescript
// apps/backend/src/config/env.ts
import { z } from 'zod';

const EnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  CLIENT_URL: z.string().url(),
  OPENAI_API_KEY: z.string().startsWith('sk-').optional(),
});

export const env = EnvSchema.parse(process.env);
```

## 📦 Per-Platform Rules

| Platform | Prefix | Example |
|---|---|---|
| Expo (mobile) | `EXPO_PUBLIC_` | `EXPO_PUBLIC_API_URL` |
| Vite (web) | `VITE_` | `VITE_API_URL` |
| Next.js | `NEXT_PUBLIC_` | `NEXT_PUBLIC_API_URL` |
| Node.js (server) | *(none)* | `DATABASE_URL`, `JWT_ACCESS_SECRET` |

## 📚 References

- [dotenv docs](https://github.com/motdotla/dotenv)
- [Vite env variables](https://vitejs.dev/guide/env-and-mode)
- [Expo environment variables](https://docs.expo.dev/guide/environment-variables/)
- [Zod validation](https://zod.dev)
