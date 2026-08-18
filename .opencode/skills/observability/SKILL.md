---
name: observability
description: Configures observability stack: OpenTelemetry traces, Prometheus metrics, structured logging, and distributed tracing. Use when adding telemetry to services, configuring dashboards, or debugging production issues with traces.
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires Node 20+ and pnpm 9+."
allowed-tools: Bash(node:*) Read
metadata:
  trigger: ["observability", "OpenTelemetry", "tracing", "metrics", "Prometheus", "Grafana", "telemetry", "distributed tracing"]
  scope: [global, project]
  version: "1.0.0"
---

# 📊 Observability — Traces, Metrics, Logs

Use this skill when implementing OpenTelemetry, configuring Prometheus/Grafana, or adding distributed tracing.

## 📋 When to Use

- Use when adding OpenTelemetry instrumentation to a service
- Use when configuring Prometheus metrics endpoints
- Use when setting up Grafana dashboards
- Use when debugging production issues with distributed traces
- Do NOT use for basic logging (see monitoring skill)

## 🚦 Hard Rules

- **Always** use OpenTelemetry SDK for traces (vendor-neutral)
- **Always** propagate `traceparent` headers across service boundaries
- **Always** expose `/metrics` endpoint in Prometheus format
- **Never** log full request/response bodies in traces (PII risk)
- **Never** use `console.log` for production telemetry

## 🛠️ OpenTelemetry Setup

```bash
pnpm add @opentelemetry/sdk-node @opentelemetry/api @opentelemetry/exporter-trace-otlp-http
```

```typescript
// packages/telemetry/src/tracing.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';

const sdk = new NodeSDK({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: 'mercado-api',
  }),
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
  }),
});

sdk.start();
```

## 📈 Prometheus Metrics

```typescript
// apps/backend/src/routes/metrics.ts
import { Registry, Counter, Histogram } from 'prom-client';

const register = new Registry();

export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'path', 'status'],
  registers: [register],
});

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration',
  labelNames: ['method', 'path'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [register],
});

// GET /metrics
router.get('/metrics', async (_req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

## 🔗 Trace Context Propagation

```typescript
// Propagate traceparent in outgoing HTTP calls
import { context, propagation } from '@opentelemetry/api';

const headers = {};
propagation.inject(context.active(), headers);
await fetch(otherServiceUrl, { headers });

// Propagate in Socket.io
socket.emit('event', data, { traceparent: headers.traceparent });
```

## 📚 References

- [OpenTelemetry Node.js](https://opentelemetry.io/docs/languages/js/)
- [Prometheus client for Node.js](https://github.com/siimon/prom-client)
- [Grafana dashboards](https://grafana.com/grafana/dashboards/)
