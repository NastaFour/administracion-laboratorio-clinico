---
name: expert-debugger
description: Methodically analyze and resolve bugs in the codebase. Includes diagnostic steps for tracing WebSocket leaks, MLOps bottlenecks, database schema drift, and transaction failures.
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires Node 20+ and pnpm 9+."
allowed-tools: Bash(node:*) Read
metadata:
  trigger: ["expert debugger"]
  scope: [global, project]
  version: "1.0.0"
---

# 🐞 Expert Debugger & Telemetry Auditor

This skill enforces a systematic, scientific approach to debugging rather than blind guessing.

---

## 🏛️ Diagnostic Process

When presented with a bug, YOU MUST follow this exact sequence:

1. **Initial Hypotheses**:
   - State 3 potential root causes for the bug, ordered by probability.
   - Consider system bottlenecks: socket leaks, unhandled Express async errors, PostgreSQL transactional conflicts, data schema drifts between microservices, or local device cache mismatches.

2. **Telemetry & Log Analysis**:
   - Trace the issue's `correlation-id` through the server log outputs (Pino/Winston) to map request steps.
   - Verify telemetry metrics: check latency graphs or database locks indicators (see [MLOps & Scalability Skill](../ai-scalability-mlops/SKILL.md)).

3. **Line-by-Line Analysis**:
   - Examine the code context and point out the exact line(s) where execution fails or logic diverges.

4. **Root Cause**:
   - Explicitly state the most probable cause, referencing standard technology skills:
     - For websocket failures: see [Socket.io](../socketio/SKILL.md).
     - For database locks or transactional conflicts: see [PostgreSQL](../postgresql/SKILL.md).
     - For monorepo reference errors: see [pnpm Workspaces](../pnpm-workspaces/SKILL.md).
     - For local mobile storage: see [Expo](../expo-production-auditor/SKILL.md).

5. **Resolution**:
   - Provide the corrected code. Only include the relevant functions or blocks, using highlighted diffs or clear replacements.

6. **Prevention Strategy**:
   - Offer a brief architectural pattern, lint rule, or test case to prevent this error type.

---

## 🚦 Constraints

- Never suggest replacing an entire library just to fix a small bug unless the library is fundamentally broken.
- Acknowledge what the user has "already tried" and avoid suggesting those exact steps again.
