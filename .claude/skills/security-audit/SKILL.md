---
name: security-audit
description: ECC-inspired security scanning workflow. Covers OWASP Top 10 checks, dependency vulnerability scanning, secret detection, input sanitization review, and agentic security validation. Use when implementing auth flows, processing payments, handling user data, or deploying to production.
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires Node 20+ and pnpm 9+."
allowed-tools: Bash(node:*) Read
metadata:
  trigger: ["security audit", "security scan", "vulnerability", "CVE", "OWASP", "pen test", "security review", "secret detection", "ECC security"]
  scope: [global, project]
  version: "1.0.0"
---

# 🛡️ Security Audit Workflow (ECC AgentShield Pattern)

Systematic security review inspired by [ECC's security guide](https://github.com/affaan-m/ECC/blob/main/the-security-guide.md) and AgentShield (1,282 tests, 102 rules). Use this skill before pushing code that touches authentication, payments, user data, or production deploys.

## 📋 When to Use

- Use before deploying any code that handles authentication
- Use when processing payments or sensitive financial data
- Use when adding new dependencies (check for CVEs)
- Use when handling user input that could be injection vectors
- Use during Phase 6 (Verify) of SDD for security-critical features
- Do NOT use for simple UI changes or documentation

## 🚦 Hard Rules

- **Always** run dependency audit: `pnpm audit --prod`
- **Always** verify no secrets in committed files (API keys, tokens, passwords)
- **Always** validate ALL user input with Zod schemas before processing
- **Always** use parameterized queries (Prisma handles this, but verify)
- **Never** ship code with `console.log(token)` or similar secret leakage
- **Never** use `eval()`, `Function()`, or dynamic code execution
- **Never** trust client-side validation alone — always validate server-side

## 🛠️ Audit Checklist

### 🔑 Authentication & Authorization

- [ ] JWT access tokens stored in memory, not LocalStorage/AsyncStorage
- [ ] Refresh tokens in HTTP-only, Secure, SameSite=Strict cookies
- [ ] Token rotation implemented (old refresh token invalidated on use)
- [ ] Password hashing uses bcrypt(12) or argon2
- [ ] Rate limiting on auth endpoints (100 req/15min)
- [ ] Role-based access control (RBAC) on all admin routes

### 📦 Dependencies

- [ ] `pnpm audit --prod` shows zero critical/high vulnerabilities
- [ ] All dependencies are actively maintained (last commit < 6 months)
- [ ] No deprecated packages in `package.json`
- [ ] Dependency versions are pinned (no `^` for security-critical deps)
- [ ] `pnpm-lock.yaml` is committed and up to date

### 🔌 Input Validation

- [ ] All API request bodies validated with Zod schemas
- [ ] All Socket.io payloads validated with Zod before processing
- [ ] SQL injection prevented (Prisma parameterized queries — verify no raw SQL)
- [ ] XSS prevented (React auto-escapes, verify user-generated content)
- [ ] File upload limits and type validation enforced

### 🔐 Secrets & Configuration

- [ ] No API keys, tokens, or passwords in source code
- [ ] `.env` file in `.gitignore`
- [ ] All secrets accessed via `process.env` or a config module
- [ ] Production secrets different from staging/development
- [ ] Database URLs not hardcoded in CI configs

### 🌐 Network & Transport

- [ ] HTTPS enforced in production (secure cookies)
- [ ] CORS whitelist explicit (never `origin: '*'`)
- [ ] Rate limiting on all public endpoints
- [ ] Helmet middleware configured (CSP, HSTS, X-Frame-Options)
- [ ] Socket.io connections validated with JWT handshake

### 🗄️ Database

- [ ] Principle of least privilege: DB user has only required permissions
- [ ] Sensitive columns encrypted or hashed (passwords, tokens)
- [ ] Database backups automated and encrypted
- [ ] No raw SQL with user input (always use Prisma parameterized queries)

### 🧪 Testing for Security

- [ ] Auth flow tests: login, register, token refresh, logout
- [ ] Input validation tests: SQL injection, XSS, oversized payloads
- [ ] Rate limiting tests: verify 429 responses after threshold
- [ ] Role escalation tests: verify employee can't access admin routes

## 🔍 Secret Detection Pattern

```bash
# Before committing, scan for accidental secrets
git diff --cached | pnpm dlx secretlint --format compact

# Or use ripgrep locally
rg -i "api.?key|secret|token|password" --glob '!node_modules' --glob '!.git'
```

## 🔍 Sanitization Scans (ECC Pattern)

Inspired by ECC's security guide. Before any commit, scan for hidden injection vectors.

### Unicode Sanitization

Zero-width characters, bidi override, and hidden Unicode are invisible to humans but executable to LLMs:

```bash
# Scan for zero-width and bidi control characters (ECC recommended)
rg -nP '[\x{200B}\x{200C}\x{200D}\x{2060}\x{FEFF}\x{202A}-\x{202E}]'

# Scan for HTML comments and suspicious hidden blocks
rg -n '<!--|<script|data:text/html|base64,'
```

### Prompt Injection in Skills & Rules

Snyk's ToxicSkills study (Feb 2026) found prompt injection in **36% of 3,984 public skills**. Scan skill files for suspicious patterns:

```bash
# Check for outbound network commands in skills/rules
rg -n 'curl|wget|nc|scp|ssh' --glob '**/SKILL.md' --glob '**/*.md'

# Check for permission escalations  
rg -n 'enableAllProjectMcpServers|ANTHROPIC_BASE_URL|--dangerously-skip-permissions'

# Check for hidden base64 payloads
rg -nP '[A-Za-z0-9+/]{40,}={0,2}' --glob '!node_modules' --glob '!pnpm-lock.yaml'
```

### Supply Chain Awareness

Treat skills, hooks, and MCP configs as supply chain artifacts:
- Verify skill sources (check GitHub stars, last commit date)
- Scan third-party skills before installing (`pnpm dlx skills@latest install` — review first)
- Never auto-approve MCP servers from untrusted repos
- Rotate credentials after running agent on untrusted repos

## 🔗 Integration with Existing Skills

| Check | Related Skill |
|---|---|
| JWT + auth validation | `04-backend/jwt-bcrypt/SKILL.md` |
| Dependency audit | `06-code-quality/dependency-guardian/SKILL.md` |
| Input validation (Zod) | `04-backend/socketio/SKILL.md` |
| Rate limiting | `04-backend/expressjs/SKILL.md` |
| Env management | `06-code-quality/env-management/SKILL.md` |
| Database security | `04-backend/postgresql/SKILL.md` |
| Code review | `02-dev-roles/code-reviewer/SKILL.md` |
| Production deploy | `08-devops/ci-cd/SKILL.md` |

## 📚 References

- [ECC Security Guide](https://github.com/affaan-m/ECC/blob/main/the-security-guide.md)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [AgentShield Docs](https://github.com/affaan-m/ECC)
- `04-backend/api-design/SKILL.md` — API security conventions
