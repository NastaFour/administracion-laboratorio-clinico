---
name: nodejs
description: Guidelines for backend Node.js development. Enforces ESM modules, proper async event loop handlers, structured logging, and non-root execution environments. Use when developing the backend server or background workers.
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires Node 20+ and pnpm 9+."
allowed-tools: Bash(node:*) Read
metadata:
  trigger: ["nodejs", "node.js", "ESM", "clustering", "backend"]
  scope: [global, project]
  version: "1.0.0"
---

# ⚙️ Node.js Backend Development (2026 Standards)

Use this skill when developing the backend server or background workers for the [APP].

## 🚨 Backend Core Standards

1. **ESM Syntax (ECMAScript Modules)**:
   - Always use `"type": "module"` in `package.json`.
   - Import modules using `import` syntax. Never use CommonJS `require()`.
   - Explicitly include file extensions in relative imports (e.g. `import db from './db.js';`).

2. **Async Operations & Handlers**:
   - Prevent blocking the main event loop. Always use non-blocking API methods.
   - Use `async/await` syntax for async routines instead of nesting callbacks.
   - Wrap async calls in robust `try/catch` or capture them using a global wrapper to prevent `UnhandledPromiseRejection` crashes.

3. **Dynamic Ports**:
   - The application must dynamically listen on the port assigned by the environment:
     ```javascript
     const PORT = process.env.PORT || 5000;
     server.listen(PORT, () => {
       logger.info(`Server listening on port ${PORT}`);
     });
     ```
   - Never hardcode the port in production code.

## 🔒 Security & Logging

1. **Process Privilege Limiting**:
   - Running Node.js as the `root` user in production is strictly prohibited.
   - Always use a standard non-privileged user (e.g., standard `node` user in Docker, or dedicated user under systemd/PM2).

2. **Structured JSON Logging**:
   - Use `pino` or `winston` for logging in JSON format.
   - Prohibit `console.log` in production.
   - Include a `correlation-id` in all log objects to trace a single request flow between Express APIs and WebSockets.

## 🛒 [APP] Execution Context
- **Inventory Schedulers**: When running background tasks (e.g. checking out-of-stock items at midnight), handle operations gracefully to keep the server responsive to buyer checkouts.
- **WebSocket Handshakes**: Log handshake details including the authorized user's details for auditing and tracing support requests.
