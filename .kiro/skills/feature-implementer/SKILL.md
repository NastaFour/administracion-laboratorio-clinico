---
name: feature-implementer
description: Implement production-ready features and code following best practices. Use this skill when asked to generate functional code, endpoints, or complex logic.
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires Node 20+ and pnpm 9+."
allowed-tools: Bash(node:*) Read
metadata:
  trigger: ["feature implementer"]
  scope: [global, project]
  version: "1.0.0"
---

This skill sets the standard for senior-level code implementation. It prevents the AI from generating trivial, non-production "tutorial-grade" code.

## Implementation Standards
When writing code, adhere strictly to these principles:
- **Production-Ready**: Include full input validation, graceful error handling, and edge-case management. No `console.log` for error handling in production logic.
- **Single Responsibility**: Every function, hook, or class must do one thing well.
- **Strict Typing**: If using TypeScript or typed languages, define accurate interfaces/types. Do not use `any`.

## Contextual Awareness
Before coding, rely on existing context:
- Sync with the [Project Tracker](../project-tracker/SKILL.md) for styling/framework conventions.
- Map code logic to the specific [[APP] Business Workflow](../application-workflow/SKILL.md).
- Prioritize technology guidelines:
  - **Backend APIs**: Refer to [Node.js](../nodejs/SKILL.md), [Express.js](../expressjs/SKILL.md), [Prisma ORM](../prisma-orm/SKILL.md), [Socket.io](../socketio/SKILL.md), and [JWT/Bcrypt](../jwt-bcrypt/SKILL.md).
  - **Admin Web Panel**: Refer to [React/Vite](../react-vite/SKILL.md) and [Tailwind CSS](../tailwindcss/SKILL.md).
  - **Mobile Client**: Refer to [React Native](../react-native/SKILL.md) and [Expo](../expo-production-auditor/SKILL.md).

## Delivery Format
1. **Dependencies**: If new libraries are required, provide the installation command first (adhere to workspace locks).
2. **Code Blocks**: Separate code by file. Include the absolute or relative file path as a markdown header before each code block.
3. **Comments**: ONLY comment on non-obvious business logic or complex algorithms. The code must explain itself.
4. **How to Test**: End with a concise instruction on how the user can test this specific implementation locally.
5. **Skill Handoff**: Upon completion of the implementation, conclude your response by explicitly asking the user: *"Should we invoke the `qa-tester` to cover these new edge cases, or proceed to `dod-checker` if the phase is complete?"*
