---
name: lottie-animations
description: Lottie integration for React web and Expo mobile — onboarding flows, empty states, success celebrations, loading indicators, and error states using lightweight vector animations. Covers lottie-react, @lottiefiles/dotlottie-react, lazy loading, file optimization, and static fallbacks. Use when adding illustrated animations (not UI motion) for onboarding, empty states, or success feedback.
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires Node 20+."
metadata:
  trigger: ["lottie", "lottie-react", "dotlottie", "onboarding animation", "empty state", "success animation", "loading animation", "vector animation", "after effects", "celebration animation", "illustration animation"]
  scope: [global, project]
  version: "1.0.0"
allowed-tools: Bash(node:*) Read
---

# 🎬 Lottie Animations

Illustrated vector animations for onboarding, empty states, success, and loading. Unlike Motion/GSAP (which animate UI elements), Lottie plays pre-made illustration animations (from After Effects).

## 📋 When to Use

- Use for **onboarding** flows (3-4 illustrated steps)
- Use for **empty states** (no data yet → friendly illustration)
- Use for **success celebrations** (booking confirmed → confetti)
- Use for **loading** that's > 2s (spinner gets boring)
- Do NOT use for UI micro-interactions (use `micro-interactions` + Motion)

## 🚦 Hard Rules

- **Always** lazy-load Lottie files (they can be 50KB-500KB)
- **Always** provide a static fallback (image) for reduced-motion users
- **Never** use Lottie files > 100KB without optimization
- **Always** use `.lottie` format (dotLottie) over `.json` (Lottie) when possible (90% smaller)
- **Never** autoplay Lottie with sound without user interaction

## 🛠️ Workflow

1. Read integration guide: [lottie-integration.md](references/lottie-integration.md)
2. Read use cases: [lottie-use-cases.md](references/lottie-use-cases.md)
3. Read optimization: [lottie-optimization.md](references/lottie-optimization.md)
4. Run the checker:
   ```bash
   node ./.opencode/skills/lottie-animations/scripts/check-lottie.mjs
   ```

## 📚 References

- [Lottie Integration](references/lottie-integration.md) — lottie-react + dotlottie-react setup
- [Use Cases](references/lottie-use-cases.md) — onboarding, empty, success, loading
- [Optimization](references/lottie-optimization.md) — reduce file size, lazy load
- [`motion-accessibility`](../motion-accessibility/SKILL.md) — reduced-motion fallbacks
- [`lazy-loading-patterns`](../lazy-loading-patterns/SKILL.md) — lazy load strategy
