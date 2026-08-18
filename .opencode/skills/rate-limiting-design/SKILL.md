---
name: rate-limiting-design
description: Patterns for differentiated rate limiting by endpoint type. Separates auth-strict (login/register, 5 req/15min) from session-moderate (me/refresh/logout, 120 req/min) to prevent 429 loops on endpoints called on every page load. Use when configuring express-rate-limit or debugging 429 Too Many Requests loops.
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires Node 20+."
metadata:
  trigger: ["rate limit", "429 too many requests", "rate limiter", "auth limiter", "express rate limit", "throttle", "/auth/me 429"]
  scope: [global, project]
  version: "1.0.0"
allowed-tools: Bash(node:*) Read
---

# ⏱️ Rate Limiting Design

Prevents the bug where an auth rate limiter (5 req/15min) is applied to ALL auth endpoints including `/auth/me`, which gets called on every page load. React StrictMode double-mounts effects, exhausting the limit and causing a 429 loop.

## 📋 When to Use

- Use when configuring rate limiting on Express routes
- Use when debugging `429 Too Many Requests` on session endpoints
- Use when `/auth/me` returns 429 in a loop after login
- Do NOT use for WebSocket rate limiting (use `socketio` skill)

## 🚦 Hard Rules

- **Never** apply the same limiter to login and session endpoints
- **Always** separate `authLimiter` (login/register) from `sessionLimiter` (me/refresh/logout)
- **Always** set `trust proxy` when behind Render/Railway/Nginx
- **Never** use IP-only keying for mobile (NAT carriers share IPs) — key by user ID if authenticated

## 🛠️ Workflow

1. Consult the tier table to assign limiters: [tier-table.md](references/tier-table.md)
2. Run the checker to detect shared limiters:
   ```bash
   node ./.opencode/skills/rate-limiting-design/scripts/check-limiters.mjs
   ```
3. Fix any shared limiter by splitting into the appropriate tier
4. Re-run to confirm

## 📚 References

- [Tier Table](references/tier-table.md) — 4 tiers with express-rate-limit config
- [`api-design`](../api-design/SKILL.md) — endpoint → tier mapping
- [`expressjs`](../expressjs/SKILL.md) — route modularization
