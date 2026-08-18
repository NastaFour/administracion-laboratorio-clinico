---
name: motion-gsap
description: Advanced animation with GSAP for cases that exceed Motion — complex timelines, ScrollTrigger pin/scrub/snap, SplitText (text reveal), DrawSVG (path drawing), MorphSVG (shape morphing), and Flip (layout transitions). Covers useGSAP() hook, gsap.context() cleanup, and matchMedia for responsive/reduced-motion. Use when Motion isn't enough for complex sequencing, SVG animation, or scroll storytelling.
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires Node 20+ and GSAP."
metadata:
  trigger: ["gsap", "timeline animation", "SplitText", "DrawSVG", "MorphSVG", "Flip animation", "ScrollSmoother", "useGSAP", "gsap context", "complex timeline", "svg morph", "text reveal animation", "layout flip"]
  scope: [global, project]
  version: "1.0.0"
allowed-tools: Bash(node:*) Read
---

# 🎯 GSAP — Advanced Animation

For cases that exceed Motion: complex timelines, SVG morphing, text splitting, layout flips, and scroll storytelling with pin/scrub/snap.

## 📋 When to Use

- Use when you need a **timeline** (sequential, labeled animation sequence)
- Use when you need **SplitText** (character/word reveal)
- Use when you need **DrawSVG** (animate SVG path drawing)
- Use when you need **MorphSVG** (morph between SVG shapes)
- Use when you need **Flip** (animate between layout states)
- Use when you need **ScrollSmoother** (buttery smooth scroll)
- Do NOT use for simple hover/press (use `micro-interactions`) or basic reveals (use `motion-framer`)

## 🚦 Hard Rules

- **Always** use `useGSAP()` hook (not `useEffect`) for React cleanup
- **Always** wrap animations in `gsap.context()` for scoped cleanup
- **Always** call `ctx.revert()` on unmount
- **Never** create ScrollTrigger without cleanup (memory leak)
- **Always** use `gsap.matchMedia()` for responsive + reduced-motion
- **Never** use free GSAP plugins (SplitText, MorphSVG) in production without Club GSAP license

## 🛠️ Workflow

1. Read timeline patterns: [timelines.md](references/timelines.md)
2. Read SVG + text patterns: [svg-text.md](references/svg-text.md)
3. Read Flip layout patterns: [flip-layout.md](references/flip-layout.md)
4. Read React integration: [gsap-react.md](references/gsap-react.md)
5. Run the checker:
   ```bash
   node ./.opencode/skills/motion-gsap/scripts/check-gsap.mjs
   ```

## 📚 References

- [Timelines](references/timelines.md) — sequences, labels, stagger, position
- [SVG & Text](references/svg-text.md) — SplitText, DrawSVG, MorphSVG
- [Flip Layout](references/flip-layout.md) — layout state transitions
- [GSAP + React](references/gsap-react.md) — useGSAP, context, matchMedia
- [`scroll-animations`](../scroll-animations/SKILL.md) — ScrollTrigger usage
- [`motion-framer`](../motion-framer/SKILL.md) — simpler alternative (80% of cases)
- [`motion-accessibility`](../motion-accessibility/SKILL.md) — reduced-motion
