---
name: nodejs-module-loading
description: Guide to ES module import evaluation order in Node.js. Explains that static imports are evaluated before module code, so dotenv.config() in server.ts line 18 does not reach env.ts imported earlier. Use when debugging "Environment validation failed" with undefined env vars, or when setting up dotenv, env.ts, or config modules in an ESM backend.
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires Node 20+."
metadata:
  trigger: ["dotenv", "env undefined", "environment validation failed", "module loading", "esm imports", "import order", "env vars undefined", "dotenv config", "env.ts"]
  scope: [global, project]
  version: "1.0.0"
allowed-tools: Bash(node:*) Read
---

# 📦 Node.js Module Loading Order (ESM)

Explains the evaluation order of ES module imports in Node.js. Prevents bug #8 where `dotenv.config()` called in `server.ts` line 18 didn't reach `env.ts` (imported earlier), causing all env vars to be `undefined`.

## 📋 When to Use

- Use when "Environment validation failed" and all env vars are `undefined`
- Use when setting up `dotenv` in an ESM Node.js backend
- Use when `env.ts` validates vars but they're undefined despite `.env` file existing
- Use when `import "dotenv/config"` vs `dotenv.config()` confusion
- Do NOT use for CommonJS (`require()`) — different loading order

## 🚦 Hard Rules

- **Always** put `import "dotenv/config"` as the FIRST import in the module that reads `process.env`
- **Never** call `dotenv.config()` in `server.ts` expecting it to apply to modules imported before it
- **Always** remember: ES module static imports are evaluated BEFORE the module's own code
- **Never** assume import order in the file matches evaluation order across modules

## 🛠️ Workflow

1. Read the ESM evaluation order guide: [esm-evaluation-order.md](references/esm-evaluation-order.md)
2. Run the checker to detect late dotenv loading:
   ```bash
   node ./.opencode/skills/nodejs-module-loading/scripts/check-env-loading.mjs
   ```
3. Fix by moving `import "dotenv/config"` to the top of `env.ts`
4. Re-run to confirm

## 📚 References

- [ESM Evaluation Order](references/esm-evaluation-order.md) — diagram + anti-pattern + rule
- [`env-management`](../env-management/SKILL.md) — env var management across environments
- [`nodejs`](../nodejs/SKILL.md) — backend Node.js guidelines
