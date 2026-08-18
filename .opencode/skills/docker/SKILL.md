---
name: docker
description: Docker dev environment setup and production deployment via Railway/Render/VPS for pnpm monorepos. Use when configuring Docker locally, writing Dockerfiles, or deploying containers to a host.
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires Node 20+ and pnpm 9+."
allowed-tools: Bash(node:*) Read
metadata:
  trigger: ["docker", "docker compose", "contenedor", "Dockerfile", "despliegue"]
  scope: [global, project]
  version: "1.0.0"
---

# 🐳 Docker, Dev Environment & Deployment

Usa este skill al configurar el entorno local de desarrollo o preparar el despliegue en producción.

---

## 🗄️ 1. PostgreSQL Local con Docker Compose

Crea `docker-compose.yml` en la raíz del monorepo:

```yaml
version: '3.9'
services:
  postgres:
    image: postgres:16-alpine
    container_name: mercado_db
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    ports:
      - '5432:5432'
    volumes:
      - mercado_pgdata:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  mercado_pgdata:
```

- Todos los valores provienen de `.env` en la raíz — **nunca** hardcodear credenciales.
- El `.env` **DEBE** estar en `.gitignore`.

---

## 🔌 2. Variables de Entorno

El `.env` raíz del monorepo debe definir:

| Variable | Descripción | Ejemplo |
|---|---|---|
| `DATABASE_URL` | Cadena de conexión de Prisma | `postgresql://user:pass@localhost:5432/mercado` |
| `JWT_ACCESS_SECRET` | Secreto para firmar access tokens (15 min) | `cadena-aleatoria-256-bits` |
| `JWT_REFRESH_SECRET` | Secreto para firmar refresh tokens (7 días) | `otra-cadena-aleatoria` |
| `PORT` | Puerto del servidor Express | `3000` |
| `CLIENT_URL` | URL del admin panel (CORS whitelist) | `http://localhost:5173` |
| `EXPO_PUBLIC_API_URL` | URL del backend para la app Expo | `http://192.168.1.x:3000` |
| `OPENAI_API_KEY` | Clave del proveedor LLM | `sk-...` |
| `STRIPE_SECRET_KEY` | Clave secreta de Stripe (si se usa) | `sk_test_...` |

Para el Admin Panel (Vite), todas las variables del cliente deben llevar prefijo `VITE_`:
- `VITE_API_URL`, `VITE_SOCKET_URL`

---

## 🚀 3. Scripts pnpm Raíz

```json
{
  "scripts": {
    "db:up":      "docker compose up -d postgres",
    "db:down":    "docker compose down",
    "db:migrate": "pnpm --filter @org/backend migrate",
    "db:seed":    "pnpm --filter @org/backend seed",
    "dev:backend": "pnpm --filter @org/backend dev",
    "dev:admin":   "pnpm --filter @org/admin-panel dev",
    "dev:mobile":  "pnpm --filter @org/mobile-app start",
    "dev":         "pnpm db:up && concurrently \"pnpm dev:backend\" \"pnpm dev:admin\""
  }
}
```

---

## ☁️ 4. Despliegue en Producción

El proyecto soporta 3 opciones de despliegue:

### Opción A: Railway (Recomendado para MVP)
- Conecta el repositorio GitHub a Railway.
- Crea 2 servicios: `backend` (apunta a `apps/backend`) y `postgres` (Plugin PostgreSQL de Railway).
- Railway detecta automáticamente el monorepo si configuras `NIXPACKS_BUILD_CMD` y `START_CMD`.
- Las variables de entorno se configuran directamente en el dashboard de Railway.

### Opción B: Render
- Crea un Web Service para `apps/backend` con Build Command: `pnpm install --frozen-lockfile && pnpm --filter @org/backend build`.
- Usa el PostgreSQL managed de Render para producción.
- Para el Admin Panel, crea un Static Site apuntando a `apps/admin-panel`.

### Opción C: VPS (máximo control)
- Instala Docker + Docker Compose en el VPS.
- Usa un `Dockerfile` multi-stage por workspace para optimizar el tamaño de imagen:
  ```dockerfile
  # apps/backend/Dockerfile
  FROM node:20-alpine AS builder
  WORKDIR /app
  COPY . .
  RUN pnpm install --frozen-lockfile && pnpm --filter @org/backend build

  FROM node:20-alpine AS runner
  WORKDIR /app
  COPY --from=builder /app/apps/backend/dist ./dist
  COPY --from=builder /app/node_modules ./node_modules
  EXPOSE 3000
  CMD ["node", "dist/index.js"]
  ```
- Usa Nginx como reverse proxy frente al backend y para servir el Admin Panel estático.
- Configura SSL con Certbot (Let's Encrypt).

---

## 📦 5. Reglas de Seguridad en Producción

- Nunca ejecutes Node.js como usuario `root` en el contenedor/VPS.
- Todas las migraciones en producción se ejecutan con `prisma migrate deploy` — nunca `prisma migrate dev`.
- Los backups de PostgreSQL se deben automatizar con `pg_dump` vía cron, almacenados en un bucket externo (S3, Backblaze).
- Consulta [PostgreSQL Skill](../postgresql/SKILL.md) para las reglas de backup y encriptación.

---

## 🛡️ 6. Sandboxing para Agentes de IA (ECC Pattern)

Inspirado en la [guía de seguridad de ECC](https://github.com/affaan-m/ECC/blob/main/the-security-guide.md). Si ejecutás agentes de IA con acceso al filesystem, usá un contenedor aislado que limite el blast radius.

### Container sin Network (recomendado)

```yaml
# docker-compose.sandbox.yml
services:
  agent-sandbox:
    build: .
    user: "1000:1000"
    working_dir: /workspace
    volumes:
      - ./workspace:/workspace:rw
    cap_drop:
      - ALL
    security_opt:
      - no-new-privileges:true
    networks:
      - agent-internal

networks:
  agent-internal:
    internal: true
```

`internal: true` impide que el agente haga llamadas de red hacia afuera.

### Container One-Off (sin network, solo filesystem)

```bash
docker run -it --rm \
  -v "$(pwd)":/workspace \
  -w /workspace \
  --network=none \
  --cap-drop=ALL \
  --security-opt=no-new-privileges \
  node:20 bash
```

### Tool Restrictions (baseline ECC)

```json
{
  "permissions": {
    "deny": [
      "Read(~/.ssh/**)",
      "Read(~/.aws/**)",
      "Read(**/.env*)",
      "Write(~/.ssh/**)",
      "Write(~/.aws/**)",
      "Bash(curl * | bash)",
      "Bash(ssh *)",
      "Bash(scp *)",
      "Bash(nc *)"
    ]
  }
}
```

### Principio de Least Agency

No le des al agente más acceso del que necesita:
- **Identidad separada**: `agent@tudominio.com`, no tu cuenta personal
- **Credenciales de corta duración**: tokens scoped, no llaves maestras
- **Network deny por defecto**: solo abrir puertos específicos si los necesita
- **Nunca root**: `USER 1000:1000` en Dockerfile
- **Nunca producción directo**: staging → PR aprobado → deploy manual

### Kill Switch Rápido

```bash
# Matar el process group entero, no solo el padre
kill -9 -$(pgrep -f "claude|codex|opencode")

# Si usás Docker, parar el contenedor inmediatamente
docker stop agent-sandbox && docker rm agent-sandbox
```

### Referencias de Seguridad

- [ECC Security Guide](https://github.com/affaan-m/ECC/blob/main/the-security-guide.md)
- [NSA MCP Security Guidance](https://www.nsa.gov/Portals/75/documents/Cybersecurity/CSI_MCP_SECURITY.pdf)
- [Snyk ToxicSkills Study](https://snyk.io/blog/toxicskills-malicious-ai-agent-skills-clawhub/)
- `02-dev-roles/security-audit/SKILL.md` — checklist completo de seguridad
