---
name: lazy-loading-patterns
description: Patterns for lazy-loading heavy dependencies (Stripe, Leaflet, LLM SDKs) in React/Vite to prevent them from executing on pages that don't use them. Covers singleton lazy, React.lazy + Suspense, and dynamic import patterns. Use when a library throws errors on pages that shouldn't use it, or when optimizing bundle size with code-splitting.
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires Node 20+."
metadata:
  trigger: ["stripe error", "loadStripe", "lazy load", "code split", "module level load", "bundle size", "React.lazy", "dynamic import", "heavy dependency", "leaf let load", "stripe en todas las paginas"]
  scope: [global, project]
  version: "1.0.0"
allowed-tools: Bash(node:*) Read
---

# 🪶 Lazy Loading Patterns

Prevents bug #9 where `loadStripe()` was called at module level in `StripeCheckout.tsx`, executing on every page that imported the component (even login, home) and throwing Stripe errors in the console.

## 📋 When to Use

- Use when a heavy library (Stripe, Leaflet, LLM SDK) throws errors on pages that don't use it
- Use when optimizing bundle size via code-splitting
- Use when a module-level call to `loadStripe()` / `new Map()` / `L.map()` runs on import
- Use when integrating Stripe, Leaflet, Mapbox, or AI SDKs in a React app
- Do NOT use for small utilities (< 10KB) — lazy loading adds overhead

## 🚦 Hard Rules

- **Never** call `loadStripe()`, `new Map()`, `L.map()` at module level (top of file, outside functions/hooks)
- **Always** wrap heavy library initialization in a singleton lazy function
- **Always** use `React.lazy()` + `Suspense` for route-level code-splitting
- **Always** verify code-split with `rollup-plugin-visualizer` — the chunk should be separate

## 🛠️ Workflow

1. Consult the lazy patterns guide: [lazy-patterns.md](references/lazy-patterns.md)
2. Run the checker to detect module-level heavy loads:
   ```bash
   node ./.opencode/skills/lazy-loading-patterns/scripts/check-module-level-loads.mjs
   ```
3. Fix by wrapping in a singleton lazy or moving to a hook
4. Re-run to confirm

## 📚 References

- [Lazy Patterns](references/lazy-patterns.md) — 3 patterns with Stripe/Leaflet/LLM examples
- [`react-vite`](../react-vite/SKILL.md) — Vite code-splitting config
- [`frontend-debugging-protocol`](../frontend-debugging-protocol/SKILL.md) — debugging module errors
