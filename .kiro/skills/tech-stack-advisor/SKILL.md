---
name: tech-stack-advisor
description: Autonomously select the optimal technology stack for a new project or feature based exclusively on the developer's known skills and proficiencies. Use this skill when proposing architectures, starting new projects, or dynamically updating the PROJECT_TRACKER.md.
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires Node 20+ and pnpm 9+."
allowed-tools: Bash(node:*) Read
metadata:
  trigger: ["tech stack advisor"]
  scope: [global, project]
  version: "1.0.0"
---

This skill acts as an architectural advisor. It guides the AI to propose, select, and justify technologies for a project by relying strictly on the developer's mastered toolbelt. It prevents the AI from suggesting random frameworks, ensuring high development velocity.

## The Developer's Arsenal (Context)

The developer (Nasta) is highly proficient in the following domains. **ONLY** select technologies from this list when architecting solutions, unless the user explicitly asks to explore something completely new:

### 🎨 Frontend
- **Frameworks**: [React / Vite](../react-vite/SKILL.md), [Next.js](../nextjs/SKILL.md)
- **Languages**: [TypeScript](../typescript/SKILL.md)
- **Styling**: [Tailwind CSS](../tailwindcss/SKILL.md) (or Vanilla CSS depending on instructions)

### ⚙️ Backend
- **Core**: [Node.js](../nodejs/SKILL.md), [Express.js](../expressjs/SKILL.md)
- **Database**: [PostgreSQL](../postgresql/SKILL.md)
- **ORM/Data**: [Prisma ORM](../prisma-orm/SKILL.md)

### 🏗️ Arquitectura & DevOps
- **Structure**: [Microservicios](../microservices/SKILL.md), [pnpm Workspaces](../pnpm-workspaces/SKILL.md)
- **Real-Time**: [Socket.io](../socketio/SKILL.md)
- **Security**: [JWT / bcryptjs](../jwt-bcrypt/SKILL.md)

### 🧠 Inteligencia Artificial
- **Capabilities**: [AI Orchestration](../ai-orchestration/SKILL.md), [LLM Integration](../llm-integration/SKILL.md)
- **Optimization**: [Prompt Engineering](../prompt-engineering/SKILL.md)
- **Infrastructure**: [API AI Billing](../api-ai-billing/SKILL.md)

### 📱 Apps Multiplataforma
- **Mobile Native**: [React Native](../react-native/SKILL.md), [Expo](../expo-production-auditor/SKILL.md)
- **Desktop**: [Electron.js](../electronjs/SKILL.md)
- **Web App**: [PWA / Capacitor](../pwa-capacitor/SKILL.md)

## Tech Selection Guidelines

When the user asks you to start a project or suggest an architecture, execute this routine:

1. **Analyze Requirements**: 
   - *¿Es un proyecto centrado en SEO o e-commerce?* -> Sugiere Next.js.
   - *¿Es un panel de administración rápido?* -> Sugiere React + Vite.
   - *¿Necesita chat o notificaciones en vivo?* -> Sugiere Node + Express + Socket.io.
   - *¿Es app de escritorio?* -> Sugiere Electron.js + Vite.
2. **Compile the Stack**: Pick exactly what is needed from the arsenal above. Do not over-engineer.
3. **Present & Justify**: Present the chosen stack to the user, briefly explaining *why* those specific tools from their arsenal are the best fit for this specific project.
4. **Update the Ledger**: Once the user approves the stack, assume the initiative and gracefully update the `Tech Stack` and `Decision Log` sections in the `PROJECT_TRACKER.md` file without being told.

**CRITICAL**: NEVER suggest tools outside of this list (e.g., Do not suggest MongoDB, Vue.js, Angular, Django, Go) unless specifically commanded. Maximize the developer's existing strengths.
