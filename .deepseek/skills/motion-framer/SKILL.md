---
name: motion-framer
description: Production-grade animation with Motion (formerly Framer Motion) for React web and React Native Reanimated 3 for mobile. Covers spring physics, layout animations, AnimatePresence exit animations, variants/stagger orchestration, scroll-linked motion, and gestures (hover/press/drag). Use when implementing any animation in React web or Expo mobile — this is the default animation library.
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires Node 20+ and Motion (framer-motion) or react-native-reanimated."
metadata:
  trigger: ["framer motion", "motion react", "animation react", "spring physics", "layout animation", "animate presence", "variants stagger", "reanimated", "react native animation", "gesture animation", "drag animation", "useScroll", "useTransform", "motion.div", "useMotionValue"]
  scope: [global, project]
  version: "1.0.0"
allowed-tools: Bash(node:*) Read
---

# 🎬 Motion (Framer Motion) + Reanimated

The default animation library for React. Covers web (Motion/framer-motion) and mobile (React Native Reanimated 3). Spring physics, layout animations, exit animations, gestures, and scroll-linked motion.

## 📋 When to Use

- Use when implementing ANY animation in React web (default choice)
- Use when implementing animations in Expo mobile (Reanimated 3)
- Use when you need spring physics (natural feel)
- Use when you need layout animations (shared element transitions)
- Do NOT use for SVG path morphing or complex timelines (use `motion-gsap`)

## 🚦 Hard Rules

- **Always** use `variants` for orchestrated animations (not inline `animate` props)
- **Always** use `type: "spring"` for physical feel (not `ease` for UI elements)
- **Always** clean up `AnimatePresence` children with `exit` variants
- **Never** animate layout properties (`width`, `height`, `top`, `left`) — use `layout` prop instead
- **Always** respect `prefers-reduced-motion` (see `motion-accessibility`)
- **Always** use `useGSAP()` or `gsap.context()` for GSAP cleanup (not `useEffect`)

## 🛠️ Workflow

1. Read spring + layout patterns: [spring-layout.md](references/spring-layout.md)
2. Read AnimatePresence (exit animations): [animate-presence.md](references/animate-presence.md)
3. Read variants + stagger: [variants-stagger.md](references/variants-stagger.md)
4. Read mobile (Reanimated 3): [mobile-reanimated.md](references/mobile-reanimated.md)
5. Run the checker:
   ```bash
   node ./.opencode/skills/motion-framer/scripts/check-motion.mjs
   ```

## 📚 References

- [Spring & Layout](references/spring-layout.md) — spring physics, `layout` prop, shared layouts
- [AnimatePresence](references/animate-presence.md) — exit animations, mode="wait"
- [Variants & Stagger](references/variants-stagger.md) — orchestrated sequences
- [Mobile (Reanimated)](references/mobile-reanimated.md) — Reanimated 3 for Expo
- [`design-system-tokens`](../design-system-tokens/SKILL.md) — motion tokens
- [`micro-interactions`](../micro-interactions/SKILL.md) — interaction patterns
- [`scroll-animations`](../scroll-animations/SKILL.md) — scroll-linked motion
- [`page-transitions`](../page-transitions/SKILL.md) — route transitions
- [`motion-accessibility`](../motion-accessibility/SKILL.md) — reduced-motion
