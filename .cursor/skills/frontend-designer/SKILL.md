---
name: frontend-designer
description: Create distinctive, production-grade frontend interfaces with high design quality. Use this skill when the user asks to build web components, pages, artifacts, posters, or applications (examples include websites, landing pages, dashboards, React components, HTML/CSS layouts, or when styling/beautifying any web UI). Generates creative, polished code and UI design that avoids generic AI aesthetics.
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires Node 20+ and pnpm 9+."
allowed-tools: Bash(node:*) Read
metadata:
  trigger: ["frontend designer"]
  scope: [global, project]
  version: "1.0.0"
---

This skill guides the creation of distinctive, production-grade frontend interfaces that avoid generic "AI slop" aesthetics. It integrates **Prompt-Driven UI Prototyping** methods to design premium layouts with absolute state control.

## Design Thinking

Before coding, understand the context and commit to a BOLD aesthetic direction:
- **Purpose**: What problem does this interface solve? (e.g. inventory updates, delivery tracks).
- **Tone**: Pick an aesthetic: minimalist, high-contrast, cyberpunk dark-mode, soft pastel, or industrial.
- **Constraints**: Technical constraints (monorepo paths, Tailwind JIT JSE, secure store checks).
- **Prototype Loop**: The developer acts as the visual architect. The AI generates responsive prototypes, while the tech lead audits state management, hooks rendering, and API connections.

## Frontend Aesthetics Guidelines

Focus on:
- **Typography**: Choose elegant Google Fonts (Inter, Outfit, Roboto). Pair a distinctive header font with a clean body font.
- **Color & Theme**: Maintain theme keys via CSS variables. Commit to dark-mode biased palettes with bright accents.
- **Motion**: Use animations for micro-interactions (staggered catalog lists loading, shopping cart count pulse). Use CSS animations or React motion libraries.
- **Dynamic Tailwind Classes**: Never use string interpolation (e.g. `bg-${color}-500`). Always define complete classes or object mappings to ensure correct compilation (see [Tailwind Skill](../tailwindcss/SKILL.md)).
- **Component Isolation**: Separate presentational components from the live data stream. Socket feeds or API calls must be handled in container wrappers to keep visual components easily reusable. This enforces the **Single Responsibility Principle** — see [SOLID & Clean Code](../solid-clean-code/SKILL.md).
- **Sanitización de Datos**: Escapar cualquier string dinámico o JSON proveniente de WebSockets o APIs antes de renderizarlo en tablas, utilizando [React/Vite DOMPurify rules](../react-vite/SKILL.md).

NEVER use generic AI-generated templates. Vary layouts, maintain high spacing values (generous padding/margins), and design layouts specific to the [APP] workflow.
