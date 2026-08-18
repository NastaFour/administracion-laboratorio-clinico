---
name: background-jobs-queues
description: Patterns for background jobs and queues using BullMQ + Redis in [APP]. Covers delayed jobs (reminders 24h/1h before booking), no-show timeout, auto-cancel, review requests, and AI reassignment triggers. Use when implementing scheduled tasks, timeouts, or any logic that should run asynchronously after a delay.
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires Node 20+ and Redis."
metadata:
  trigger: ["background job", "bullmq", "redis queue", "scheduled task", "cron", "delayed job", "reminder", "timeout", "auto cancel", "job queue", "worker"]
  scope: [global, project]
  version: "1.0.0"
allowed-tools: Bash(node:*) Read
---

# ⚙️ Background Jobs & Queues

Patterns for scheduled and asynchronous jobs using BullMQ + Redis. Covers reminders, no-show timeouts, auto-cancel, review requests, and AI reassignment.

## 📋 When to Use

- Use when implementing reminders (24h/1h before booking)
- Use when implementing no-show timeout (auto-cancel after tolerance)
- Use when any logic should run after a delay (not in the request cycle)
- Use when implementing retry logic for external APIs (email, SMS, payments)
- Do NOT use for real-time events (use `socketio`)

## 🚦 Hard Rules

- **Always** use a unique `jobId` for idempotency (e.g., `reminder-24h-${bookingId}`)
- **Always** implement retry strategy with exponential backoff
- **Always** check job idempotency at the start of the worker (early return if already processed)
- **Never** schedule a job without a way to cancel it (store jobId in DB for cancellation)
- **Always** handle the case where the entity (booking) no longer exists or changed state

## 🛠️ Workflow

1. Read the job catalog: [job-catalog.md](references/job-catalog.md)
2. Read the BullMQ setup: [bullmq-setup.md](references/bullmq-setup.md)
3. Run the checker to verify jobs have retry + idempotency:
   ```bash
   node ./.opencode/skills/background-jobs-queues/scripts/check-jobs.mjs
   ```

## 📚 References

- [Job Catalog](references/job-catalog.md) — 5+ job types with config
- [BullMQ Setup](references/bullmq-setup.md) — Redis, Queue, Worker, retry
- [`booking-scheduling-domain`](../booking-scheduling-domain/SKILL.md) — no-show protocol
- [`notifications-multichannel`](../notifications-multichannel/SKILL.md) — reminder delivery
