---
name: page-transitions
description: Route and page transition patterns for React web (React Router + AnimatePresence, View Transitions API) and React Native mobile (React Navigation custom transitions, shared element transitions). Covers fade, slide, scale, flip, and morph transitions with guidance on when to use each. Use when implementing smooth transitions between pages/routes, or when the app feels jumpy when navigating.
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires Node 20+."
metadata:
  trigger: ["page transition", "route transition", "view transition", "AnimatePresence route", "React Navigation transition", "shared element", "navigation animation", "page change animation", "route animation", "screen transition"]
  scope: [global, project]
  version: "1.0.0"
allowed-tools: Bash(node:*) Read
---

# 🔀 Page Transitions

Smooth transitions between routes/pages. Covers web (React Router + AnimatePresence, View Transitions API) and mobile (React Navigation custom transitions, shared elements).

## 📋 When to Use

- Use when navigating between pages feels jumpy/instant
- Use when implementing shared element transitions (card → detail)
- Use when the app needs to feel like a native app (smooth route changes)
- Do NOT use for modal/dropdown animations (use `motion-framer` AnimatePresence)

## 🚦 Hard Rules

- **Always** use `mode="wait"` for route transitions (exit before enter)
- **Always** keep route transitions under 400ms (longer feels slow)
- **Always** use `key={location.pathname}` to trigger AnimatePresence
- **Never** animate the entire page — animate a wrapper, not individual elements
- **Always** respect `prefers-reduced-motion` (instant transition)

## 🛠️ Workflow

1. Read web transition patterns: [web-transitions.md](references/web-transitions.md)
2. Read mobile transition patterns: [mobile-transitions.md](references/mobile-transitions.md)
3. Read transition pattern guide: [transition-patterns.md](references/transition-patterns.md)
4. Run the checker:
   ```bash
   node ./.opencode/skills/page-transitions/scripts/check-transitions.mjs
   ```

## 📚 References

- [Web Transitions](references/web-transitions.md) — React Router + AnimatePresence, View Transitions API
- [Mobile Transitions](references/mobile-transitions.md) — React Navigation custom transitions
- [Transition Patterns](references/transition-patterns.md) — fade, slide, scale, flip, morph guide
- [`motion-framer`](../motion-framer/SKILL.md) — AnimatePresence basics
- [`motion-accessibility`](../motion-accessibility/SKILL.md) — reduced-motion
