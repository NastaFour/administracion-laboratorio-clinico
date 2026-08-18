---
name: project-tracker
description: Maintain a strict, minimal-token context of the project's state, constraints, and architecture. Use this skill to preserve continuity across sessions, enforce tech stack rules, and systematically track roadmap progress without relying on chat history.
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires Node 20+ and pnpm 9+."
allowed-tools: Bash(node:*) Read
metadata:
  trigger: ["project tracker"]
  scope: [global, project]
  version: "1.0.0"
---

This skill guides the creation and maintenance of a single-source-of-truth project ledger. It ensures that every code generation and architectural choice strictly aligns with the established project guidelines, avoiding generic assumptions and technical drift.

## Contextual Anchoring

Before executing complex tasks or suggesting architectures, absorb the project state:
- **Core Vision**: What is the ultimate goal and aesthetic of this software?
- **Technical Constraints**: Strictly obey the defined tech stack. Do not hallucinate dependencies (e.g., suggesting Tailwind when the ledger mandates Vanilla CSS).
- **Current Position**: Identify the active `[/]` phase in the roadmap. Target work only towards the active phase.

**CRITICAL**: Treat the `Project Data Ledger` below as absolute law. If a user request contradicts a strict rule in the ledger, explicitly warn them before proceeding.

## Ledger Maintenance

You are responsible for keeping the ledger brutally concise and up-to-date:
- **Milestone Tracking**: Upon completing a major feature, check off `[x]` the current phase and activate `[/]` the next.
- **Phase Declaration**: When you believe a phase is finished, YOU MUST autonomously invoke the `dod-checker` skill. If the DoD Checker returns `[ 🔴 FAIL ]`, you must fix the issues immediately. If it returns `[ 🟢 PASS ]`, explicitly announce: "PHASE X COMPLETED. READY FOR PHASE Y." and wait for user confirmation. A phase CANNOT be checked off `[x]` until the DoD Checker has explicitly passed.
- **Architectural Traceability**: Instantly log any major decision (e.g., choice of state management, routing, or performance trade-offs) in the `Decision Log` to prevent circular problem-solving in future sessions.
- **Format**: Keep entries atomic. Bullet points only. No conversational fluff or large diffs.

Remember: Elegance comes from precision. Minimal tokens consumed, maximum context retained.

---

# 🗃️ PROJECT DATA LEDGER

> **Este skill es la ESTRUCTURA BASE.** El contenido específico del proyecto se mantiene en el archivo `PROJECT_TRACKER.md` del proyecto (generalmente en `retoques/PROJECT_TRACKER.md` o en raíz). Este SKILL.md define CÓMO mantener el tracker, no el contenido del proyecto actual.

## 1. 📌 Project Identity
- **Name**: (definido en PROJECT_TRACKER.md del proyecto)
- **Core Goal**: (definido en PROJECT_TRACKER.md del proyecto)
- **Tech Stack**: (definido en PROJECT_TRACKER.md del proyecto)
- **Aesthetic**: (definido en PROJECT_TRACKER.md del proyecto)

## 2. 🚦 Strict Rules
- Always use ESM modules in backend Node.js.
- Strictly store access tokens in memory and refresh tokens in HTTP-Only cookies.
- Validate all incoming websocket payloads with Zod before logic execution.
- Maintain absolute type safety with TypeScript; `any` is strictly prohibited.
- Never write credentials, database URLs, or security secrets into code or Git repositories.
- Enforce **SOLID, DRY, and KISS** on every file. Functions must not exceed 40 lines. Refer to [SOLID & Clean Code](../solid-clean-code/SKILL.md).
- All AI modules must include telemetry logging, data drift detection, and Zod input contracts. Refer to [AI/ML Scalability & MLOps](../ai-scalability-mlops/SKILL.md).

## 3. 🗺️ Roadmap & Phases

> **El roadmap específico se mantiene en `PROJECT_TRACKER.md` del proyecto (generalmente en `retoques/PROJECT_TRACKER.md`).** Este SKILL.md define el FORMATO de las fases.

Formato de fase:
- `[ ]` = pendiente, `[/]` = activa, `[x]` = completada
- Cada fase debe describir el entregable concreto y las tecnologías involucradas

## 4. 🧠 Decision Log

> **El decision log específico se mantiene en `PROJECT_TRACKER.md` del proyecto.** Usar formato: `[YYYY-MM-DD] Decisión tomada. Detalle técnico. Ver archivo/skill relacionado.`

## 5. 🐞 Deferred Issues

> **Issues diferidos se mantienen en `PROJECT_TRACKER.md` del proyecto.**