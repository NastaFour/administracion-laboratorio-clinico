---
name: ci-cd
description: CI/CD pipeline configuration for the [APP] monorepo. Covers GitHub Actions workflows, deploys to Railway/Render/VPS, and environment promotion. Use when setting up continuous integration, automatic deployment, or environment promotion.
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires Node 20+ and pnpm 9+."
allowed-tools: Bash(node:*) Read
metadata:
  trigger: ["deploy", "desplegar", "CI/CD", "github actions", "pipeline", "railway", "render", "producción", "staging"]
  scope: [global, project]
  version: "1.0.0"
---

# 🚀 CI/CD — Pipelines de Despliegue

Usa este skill al configurar integración continua, despliegue automático, o promoción entre entornos para [APP].

---

## 📋 Entornos

| Entorno | Rama | Trigger | Destino |
|---|---|---|---|
| **Staging** | `develop` | Push / PR merge | Railway (staging) |
| **Producción** | `main` | PR merge + aprobación manual | Railway / Render / VPS |
| **Preview** | `feat/*` | PR abierto | Railway (preview apps) |

---

## 🔧 GitHub Actions Workflow Base

```yaml
# .github/workflows/ci.yml
name: CI — Lint, Test, Build

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: mercado_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready --health-interval 10s --health-timeout 5s --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile

      - name: Lint
        run: pnpm -r lint

      - name: Type check
        run: pnpm -r typecheck

      - name: Unit + Integration Tests
        run: pnpm -r test
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/mercado_test
          JWT_ACCESS_SECRET: test-secret

      - name: Build check
        run: pnpm -r build
```

---

## ☁️ Deploy a Railway

```yaml
# .github/workflows/deploy-staging.yml
name: Deploy Staging → Railway

on:
  push:
    branches: [develop]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy Backend
        uses: railwayapp/railway-deploy@v1
        with:
          railway_token: ${{ secrets.RAILWAY_TOKEN }}
          service: backend
          environment: staging

      - name: Deploy Admin Panel
        uses: railwayapp/railway-deploy@v1
        with:
          railway_token: ${{ secrets.RAILWAY_TOKEN }}
          service: admin-panel
          environment: staging
```

---

## 🔐 Secrets Management

**Nunca hardcodear.** Usar:

- **GitHub Actions**: `Settings > Secrets and variables > Actions`
- **Railway**: `Variables` en el dashboard del servicio
- **Render**: `Environment Variables` en el Web Service

Lista de secrets requeridos:
- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `RAILWAY_TOKEN` (o `RENDER_API_KEY`)
- `OPENAI_API_KEY`
- `STRIPE_SECRET_KEY`

---

## 🛡️ Reglas de Promoción

1. **Staging → Producción**: requiere PR aprobado + `dod-checker` PASS
2. **Migraciones en producción**: solo `prisma migrate deploy`, nunca `prisma migrate dev`
3. **Rollback**: tener `pg_dump` del día anterior antes de cualquier deploy
4. **Healthcheck post-deploy**: `GET /api/health` debe devolver 200 en < 5s
5. Consultar `../04-backend/docker/SKILL.md` para configuración de contenedores
6. Consultar `../08-devops/monitoring/SKILL.md` para healthchecks y alertas
