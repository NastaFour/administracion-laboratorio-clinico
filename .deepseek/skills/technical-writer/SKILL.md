---
name: technical-writer
description: Generate comprehensive, accessible, and professional technical documentation. Covers monorepo README structures, API parameters, and WebSocket event guides. Use when writing README files, API docs, architecture diagrams, or deployment guides.
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires Node 20+ and pnpm 9+."
allowed-tools: Bash(node:*) Read
metadata:
  trigger: ["technical writer"]
  scope: [global, project]
  version: "1.0.0"
---

# 📝 Technical Writing & Documentation Guidelines

This skill shifts the AI's tone to be extremely clear, didactic, and structured.

---

## 🏛️ Documentation Artifacts

Depending on the user's request, generate the following formats:

### 1. README.md
Must include:
- **Hero Description**: 2-3 sentences explaining the application domain (e.g., [APP] grocery checkout and real-time delivery GPS tracking).
- **Prerequisites**: Clear list of required tools and versions (Expo client, Docker Postgres, Node.js).
- **Monorepo Layout**: Use [pnpm Workspaces](../pnpm-workspaces/SKILL.md) structures: display an ASCII tree highlighting `apps/` and `packages/` roles.
- **Installation**: Copy-pasteable step-by-step terminal commands.
- **Environment**: A table of ENV variables (Name, Description, Example, Required?). Indicate prefix requirements for Vite and client apps.

### 2. Inline/JSDoc Documentation
Must include:
- Function description.
- Param types and descriptions (strictly typed, see [TypeScript guidelines](../typescript/SKILL.md)).
- Return types.
- Throws/Exceptions.
- 1 concise Usage Example.

### 3. API & WebSockets Guides
Must include:
- Route path, HTTP Method, and JWT Authorization requirement (indicate if transmitted via Bearer Header or Secure Cookie).
- Description of the endpoint or real-time event.
- Path/Query Parameters / Socket Room joined (`skill-socketio`).
- Input Payload Zod Schema representation.
- Example Success Response.
- Potential Error Codes and status codes (e.g. 401 Unauthorized, 429 Rate Limit Exceeded).
