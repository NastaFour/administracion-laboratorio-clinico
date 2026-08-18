---
name: react-vite
description: Standards and guidelines for React and Vite development. Enforces Single Responsibility (SRP) for components, Vite configurations, and security guardrails for the [APP] Admin Panel. Use when developing or modifying React components, managing local/global state, or configuring Vite.
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires Node 20+ and pnpm 9+."
allowed-tools: Bash(node:*) Read
metadata:
  trigger: ["react", "vite", "SPA", "componentes", "hooks"]
  scope: [global, project]
  version: "1.0.0"
---

# ⚡ React & Vite Development (2026 Standards)

Use this skill when developing or modifying React components, managing local or global states, or configuring Vite projects, particularly the Web Admin Panel for the [APP].

---

## 🏛️ Single Responsibility Principle (SRP) for Components

To prevent bloated, convoluted UI code, strictly isolate responsibilities:

1. **Presenter vs Container Pattern**:
   - **Presenter Components (Dumb)**: Focus exclusively on styling and rendering layout (using classes, tailwind, elements). They do not call API fetchers or open socket flows. They receive data and event handlers via props.
   - **Container Components (Smart)**: Focus on state lifecycle, API fetching, socket subscriptions, and data transforms. They do not contain complex HTML styling; they pass clean data arrays to presenters.

2. **Custom Hooks Extraction**:
   - Extract async data loading, WebSocket listener bindings, and cart mutation math into custom React Hooks (e.g. `useInventoryManager()`, `useSupportTicket(ticketId)`).
   - This keeps component code shorter, readable, and reusable.

---

## 🚨 2026 Guardrails & Security

1. **Modern Functional Architecture**:
   - Class components are strictly prohibited. Use only functional components with hooks.
   
2. **Environment Variables**:
   - All environment variables exposed to the frontend must start with the `VITE_` prefix (e.g., `VITE_API_URL`, `VITE_SOCKET_URL`).
   - Non-prefixed variables must remain hidden.

3. **Prevention of XSS & Injection**:
   - Avoid using `dangerouslySetInnerHTML`.
   - If rendering HTML is unavoidable, sanitize first using `dompurify`.
   - Use `dompurify` for raw string rendering in data tables or dynamic interactive charts to prevent XSS.

4. **Socket.io Client Lifecycle**:
   - Socket listener instances must be declared inside `useEffect` blocks.
   - Always return a cleanup function (`socket.off(...)`) to prevent memory leaks and UI thread saturation.

---

## 🛒 [APP] Integration (Admin Web Panel)

- **Inventory Updates**: Ensure state updates (e.g. subtracting stock when an item is out) render immediately without lagging the browser.
- **Order Tracking**: Use `useEffect` cleanup loops to safely receive live coordinates from deliveries via WebSockets.
- **Support Chat**: Cleanly isolate support channel components from API logs to prevent window context pollution.
