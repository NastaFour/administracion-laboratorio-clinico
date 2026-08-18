---
name: monitoring
description: Logging, healthchecks, and telemetry standards for [APP]. Covers Pino/Winston setup, healthcheck endpoints, correlation-ID tracing, and alerts. Use when configuring observability for the backend. Do not use for CI/CD pipelines or infrastructure setup.
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires Node 20+ and pnpm 9+."
allowed-tools: Bash(node:*) Read
metadata:
  trigger: ["logging", "healthcheck", "telemetría", "monitoreo", "pino", "winston", "correlation-id", "alertas", "métricas"]
  scope: [global, project]
  version: "1.0.0"
---

# 📊 Monitoring — Logging, Healthchecks & Telemetría

Usa este skill al configurar sistemas de observabilidad para el backend de [APP].

---

## 📝 Estándar de Logging (Pino)

```typescript
// packages/shared-utils/src/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development'
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,
  redact: ['req.headers.authorization', 'req.headers.cookie'],
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      correlationId: req.headers['x-correlation-id'],
    }),
  },
});
```

**Reglas:**
- Usar `logger.info/error/warn` — nunca `console.log`
- Todo log debe incluir `correlationId`
- Redactar tokens, passwords, cookies
- En producción: salida JSON estructurada (sin pretty-print)
- Consultar `../04-backend/expressjs/SKILL.md` para el middleware de error global

---

## 🏥 Healthcheck Endpoint

```typescript
// apps/backend/src/routes/health.ts
import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

router.get('/api/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'ok',
      uptime: process.uptime(),
      db: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch {
    res.status(503).json({
      status: 'error',
      db: 'disconnected',
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
```

- Railway/Render usan este endpoint para determinar si el servicio está vivo
- Timeout: < 5 segundos
- Batería de checks: DB, Redis (si hay), memoria disponible

---

## 🔗 Correlation-ID Tracing

Cada request entrante recibe un `x-correlation-id`. Este se propaga a:
- Llamadas HTTP internas (header `x-correlation-id`)
- Eventos de Socket.io (incluido en el payload)
- Mensajes de RabbitMQ/Redis Pub/Sub (metadata)
- Logs de Prisma (vía middleware de query logging)

```typescript
// apps/backend/src/middleware/correlation.ts
import { v4 as uuid } from 'uuid';
import type { Request, Response, NextFunction } from 'express';

export function correlationMiddleware(req: Request, res: Response, next: NextFunction) {
  const id = (req.headers['x-correlation-id'] as string) || uuid();
  req.correlationId = id;
  res.setHeader('x-correlation-id', id);
  next();
}
```

Consultar `../04-backend/microservices/SKILL.md` para tracing entre servicios.

---

## 🚨 Alertas

| Evento | Severidad | Canal |
|---|---|---|
| Healthcheck falla 3x seguido | 🔴 Crítica | Email + Slack |
| Latencia p95 > 2s | 🟡 Warning | Slack |
| Tasa de error > 5% en 5min | 🔴 Crítica | Email + Slack |
| AI bot responde fallback genérico > 10x | 🟡 Warning | Admin Dashboard |
| Disco < 10% libre | 🔴 Crítica | Email |

---

## 📈 Métricas (futuro Prometheus)

```typescript
// Métricas base a exponer en /metrics (Prometheus)
// - http_requests_total{method, path, status}
// - http_request_duration_seconds{method, path}
// - socket_connections_active
// - db_query_duration_seconds{query_type}
```

Consultar `../03-ai-ml/ai-scalability-mlops/SKILL.md` para telemetría específica de modelos AI.
