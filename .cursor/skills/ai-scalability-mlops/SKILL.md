---
name: ai-scalability-mlops
description: Guidelines for scaling applications and managing AI/ML operations. Covers horizontal/vertical infrastructure configurations, database scaling, data contracts, and telemetry logging. Use when designing for scale, planning MLOps, or adding telemetry to AI modules.
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires Node 20+ and pnpm 9+."
allowed-tools: Bash(node:*) Read
metadata:
  trigger: ["escalabilidad", "MLOps", "telemetría", "data drift", "kubernetes"]
  scope: [global, project]
  version: "1.0.0"
---

# 🚀 AI/ML Scalability & MLOps Standards

Use this skill when designing deployment structures, setting up Docker/Kubernetes configurations, optimizing DB performance under load, or integrating telemetry monitors.

---

## 📈 1. Scaling Dimensions (Vertical & Horizontal)

### 💻 Vertical Scaling (Scale Up)
* **Rule**: Optimize local code before buying bigger servers.
* **Practice**: 
  - Ensure Node.js processes utilize clustering (`cluster` module) to fork instances across all available CPU cores.
  - Set RAM garbage collector limits appropriately (`--max-old-space-size`).
  - Add indexes in PostgreSQL (`skill-postgresql`) to prevent CPU bottlenecks on queries.

### 🌐 Horizontal Scaling (Scale Out)
* **Practice**:
  - Run services inside lightweight **Docker** containers.
  - Use **Kubernetes** or container dispatchers to spin up extra replicas of `apps/backend` dynamically as traffic increases.
  - Deploy a load balancer (Nginx / HAProxy) in front of backend pods to distribute incoming traffic.
  - Ensure servers are strictly **stateless**: session tokens must reside in clients, and shared cache data (like socket active rooms list) must reside in **Redis**, not in local memory.

---

## 🔁 2. MLOps Pipeline & Data Quality

When integrating AI modules (such as the Support Triage AI or the Delivery Dispatch Routing Agent):

1. **Strict Data Contracts**:
   - Every input sent to an LLM or ML model must match a strict JSON schema verified via Zod.
   - Prevent unstructured inputs from contaminating model prompts or causing processing crashes.

2. **Data Drift Tracking**:
   - Save incoming customer support query patterns in a database table to monitor if topics change over time (drift).
   - If user questions deviate significantly from the baseline categories, trigger alert notifications in the Admin dashboard indicating that support prompts need retraining.

3. **Experiment Traceability**:
   - Log the version of the prompt templates and model IDs (`gemini-1.5-flash`, `gpt-4o-mini`) used for every auto-triage ticket, enabling performance audits.

---

## 📊 3. Telemetry & Telemetry Logs

1. **Performance Metrics**:
   - Collect and track request latencies, socket connection counts, and database transaction completion times.
   - Use telemetry libraries (such as Prometheus or lightweight custom monitors) to push stats.

2. **Error Alarms**:
   - Trigger instant notifications (via email or Slack hooks) if the AI support bot responds with fallback generic strings continuously.
   - Trace exceptions back to the backend service logs using correlation-IDs.
