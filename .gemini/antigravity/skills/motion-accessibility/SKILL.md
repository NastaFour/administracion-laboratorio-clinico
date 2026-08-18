---
name: motion-accessibility
description: Motion accessibility standards — prefers-reduced-motion respect, motion-safe fallbacks (fade instead of slide), 60fps performance budgets (transform/opacity only, no layout props), will-change usage, GPU compositing, and MotionScore audit patterns. Use when auditing animations for accessibility, debugging janky animations, or ensuring compliance with WCAG 2.1 SC 2.3.3 (Animation from Interactions).
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires Node 20+."
metadata:
  trigger: ["prefers-reduced-motion", "motion accessibility", "motion a11y", "animation performance", "60fps", "janky animation", "will-change", "GPU compositing", "MotionScore", "animation audit", "reduced motion", "motion-safe", "WCAG animation"]
  scope: [global, project]
  version: "1.0.0"
allowed-tools: Bash(node:*) Read
---

# ♿ Motion Accessibility & Performance

Ensures animations are accessible (respect reduced-motion) and performant (60fps). Cross-cutting concern that applies to ALL animation skills.

## 📋 When to Use

- Use when auditing any animation for accessibility compliance
- Use when animations feel janky (< 60fps)
- Use when implementing `prefers-reduced-motion` fallbacks
- Use when setting up performance budgets for animations
- Do NOT skip this — motion accessibility is WCAG 2.1 SC 2.3.3 required

## 🚦 Hard Rules

- **Always** respect `prefers-reduced-motion: reduce` (disable non-essential animation)
- **Always** provide fallback for reduced-motion (fade instead of slide/scale)
- **Never** animate layout properties (`width`, `height`, `top`, `left`, `margin`, `padding`)
- **Always** use `transform` and `opacity` only (GPU-composited, 60fps)
- **Never** use `transition: all` (animates everything = performance killer)
- **Always** add `will-change` sparingly (only for elements about to animate, remove after)
- **Never** exceed 2 simultaneous animations per viewport (overwhelms GPU)

## 🛠️ Workflow

1. Read reduced-motion patterns: [reduced-motion.md](references/reduced-motion.md)
2. Read performance rules: [performance.md](references/performance.md)
3. Read audit checklist: [audit-checklist.md](references/audit-checklist.md)
4. Run the checker:
   ```bash
   node ./.opencode/skills/motion-accessibility/scripts/check-motion-a11y.mjs
   ```

## 📚 References

- [Reduced Motion](references/reduced-motion.md) — prefers-reduced-motion patterns
- [Performance](references/performance.md) — 60fps rules, will-change, GPU
- [Audit Checklist](references/audit-checklist.md) — MotionScore-style audit
- [`motion-framer`](../motion-framer/SKILL.md) — useReducedMotion hook
- [`motion-gsap`](../motion-gsap/SKILL.md) — matchMedia for reduced motion
- [`micro-interactions`](../micro-interactions/SKILL.md) — motion-safe fallbacks
