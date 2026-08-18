---
name: architecture-designer
description: Design comprehensive technical architectures for new projects or major features. Use this skill when asked to define the stack, folder structure, data models, or core flows of an application.
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires Node 20+ and pnpm 9+."
allowed-tools: Bash(node:*) Read
metadata:
  trigger: ["architecture designer"]
  scope: [global, project]
  version: "1.0.0"
---

This skill forces the AI to act as a Principal Software Architect. It ensures solutions are scalable, well-justified, and technically sound before any code is written.

## Architectural Context Validation
Before designing, ensure you understand the project's constraints:
- **Expected Users/Scale**: Are we designing for local grocery branches (hundreds) or city-wide scaling (thousands)?
- **Platform**: Mobile client (Expo Router), Admin web (Vite/Tailwind), and backend API (Express/Prisma).
- **Monorepo Setup**: Refer to [pnpm Workspaces](../pnpm-workspaces/SKILL.md) for root structural layouts.
- **Strict Constraints**: Confirm stack constraints from the [Project Tracker](../project-tracker/SKILL.md) and security guardrails from [JWT / Bcrypt](../jwt-bcrypt/SKILL.md) and [Socket.io](../socketio/SKILL.md).
- **SOLID & Clean Code**: Proposed architecture must not create SRP violations (e.g., fat controllers mixing DB queries, business logic, and validation in one file). Refer to [SOLID & Clean Code](../solid-clean-code/SKILL.md).
- **Scalability & MLOps**: If the design includes AI modules, confirm telemetry hooks, Zod data contracts, and stateless horizontal scaling are planned from the start. Refer to [AI/ML Scalability & MLOps](../ai-scalability-mlops/SKILL.md).

## Required Deliverables
When designing architecture, you MUST provide:
1. **Recommended Tech Stack**: Frontend, Backend, Database, and Sockets, referencing their specific skill files.
2. **Initial Folder Structure**: Output a clean ASCII tree representing the monorepo workspaces skeleton.
3. **Data Model**: Declare Prisma schema structures following [Prisma ORM Guidelines](../prisma-orm/SKILL.md).
4. **Core User Flow**: Outline flows according to the [[APP] Workflow Orchestrator](../application-workflow/SKILL.md).
5. **SOLID Compliance Map**: Show how each layer (Controller → Repository → Service → Schema) has a single responsibility. Confirm DIP is enforced via interfaces, not direct class instantiation.
6. **Architectural Decisions**: Explicitly list 3-5 major design decisions made and *why*.
7. **Risk Analysis**: Identify 2-3 potential technical risks (e.g., socket memory leaks, inventory transactional conflicts) and concrete mitigation strategies.
