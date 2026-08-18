---
name: micro-interactions
description: Copy-paste catalog of premium micro-interactions — hover lift, press scale, focus glow, tap ripple, staggered list entrance, skeleton shimmer, magnetic cursor, count pulse, and hero text reveal. Covers CSS-only, Framer Motion, and React Native Reanimated implementations. Use when buttons/elements feel "dead" or "flat", when lists appear instantly without choreography, or when adding the polish that separates AI slop from senior-level design.
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires Node 20+."
metadata:
  trigger: ["micro interaction", "hover effect", "press animation", "button hover", "stagger", "list animation", "entrance animation", "skeleton shimmer", "magnetic cursor", "text reveal", "tap feedback", "focus ring", "button animation", "interactive feedback", "UI feel"]
  scope: [global, project]
  version: "1.0.0"
allowed-tools: Bash(node:*) Read
---

# 🎭 Micro-Interactions

The difference between "dead" UI and "alive" UI. A catalog of copy-paste micro-interactions that make elements feel responsive, tactile, and premium.

## 📋 When to Use

- Use when buttons/links feel flat or dead (no hover/press feedback)
- Use when lists appear instantly instead of staggering in
- Use when loading states are blank instead of shimmer
- Use when the UI lacks "juice" or "feel"
- Do NOT over-use — every element animating = visual noise

## 🚦 Hard Rules

- **Always** add hover state to interactive elements (buttons, links, cards)
- **Always** add focus state for keyboard accessibility
- **Always** add press/active state for tactile feedback
- **Never** use `transition: all` — specify exact properties (performance)
- **Always** use `transform` and `opacity` for animation (GPU-accelerated)
- **Never** animate `width`, `height`, `top`, `left` (forces layout, janky)
- **Always** respect `prefers-reduced-motion` (see `motion-accessibility`)

## 🛠️ Workflow

1. Read hover/press/focus patterns: [hover-press-focus.md](references/hover-press-focus.md)
2. Read staggered entrance patterns: [stagger-entrance.md](references/stagger-entrance.md)
3. Read skeleton shimmer patterns: [skeleton-shimmer.md](references/skeleton-shimmer.md)
4. Read advanced effects (magnetic cursor, count pulse): [advanced-effects.md](references/advanced-effects.md)
5. Run the checker to detect dead buttons:
   ```bash
   node ./.opencode/skills/micro-interactions/scripts/check-interactions.mjs
   ```

## 📚 References

- [Hover/Press/Focus](references/hover-press-focus.md) — CSS + Tailwind + Reanimated
- [Stagger Entrance](references/stagger-entrance.md) — Framer Motion variants + CSS
- [Skeleton Shimmer](references/skeleton-shimmer.md) — gradient sweep + pulse
- [Advanced Effects](references/advanced-effects.md) — magnetic cursor, count pulse, text reveal
- [`design-system-tokens`](../design-system-tokens/SKILL.md) — motion tokens
- [`motion-framer`](../motion-framer/SKILL.md) — animation library integration
- [`motion-accessibility`](../motion-accessibility/SKILL.md) — reduced-motion fallbacks
