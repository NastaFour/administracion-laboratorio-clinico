---
name: scroll-animations
description: Scroll-driven animations — parallax, scroll-triggered reveals, scroll-linked transforms, sticky pin sections, and scroll progress indicators. Covers Motion (useScroll/useTransform) for React web and GSAP ScrollTrigger for advanced cases (pin, scrub, snap). Use when implementing scroll storytelling, parallax heroes, or any animation tied to scroll position.
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires Node 20+ and Motion or GSAP."
metadata:
  trigger: ["scroll animation", "parallax", "scroll reveal", "scroll trigger", "scroll-linked", "useScroll", "useTransform", "ScrollTrigger", "scroll progress", "pin section", "scroll storytelling", "scroll velocity", "sticky scroll"]
  scope: [global, project]
  version: "1.0.0"
allowed-tools: Bash(node:*) Read
---

# 📜 Scroll Animations

Scroll-driven motion: parallax, reveals, pin sections, scroll progress. Covers Motion `useScroll`/`useTransform` (simple) and GSAP `ScrollTrigger` (advanced).

## 📋 When to Use

- Use when implementing parallax hero sections
- Use when elements should reveal as you scroll into view
- Use when creating scroll storytelling (pinned sections that animate on scroll)
- Use when showing scroll progress indicators
- Do NOT use for hover/press interactions (use `micro-interactions`)

## 🚦 Hard Rules

- **Always** use `transform` and `opacity` for scroll-linked properties (GPU)
- **Never** use scroll event listeners without throttle/requestAnimationFrame
- **Always** clean up ScrollTrigger instances on unmount (`ScrollTrigger.kill()`)
- **Always** respect `prefers-reduced-motion` (disable parallax, keep simple fade)
- **Never** pin sections without a fallback (breaks on mobile if buggy)

## 🛠️ Workflow

1. Read Motion scroll patterns: [scroll-reveal.md](references/scroll-reveal.md)
2. Read parallax patterns: [parallax.md](references/parallax.md)
3. Read GSAP ScrollTrigger: [gsap-scrolltrigger.md](references/gsap-scrolltrigger.md)
4. Run the checker:
   ```bash
   node ./.opencode/skills/scroll-animations/scripts/check-scroll.mjs
   ```

## 📚 References

- [Scroll Reveal](references/scroll-reveal.md) — Motion useScroll + useTransform
- [Parallax](references/parallax.md) — multi-layer parallax, 3D planes
- [GSAP ScrollTrigger](references/gsap-scrolltrigger.md) — pin, scrub, snap, batch
- [`motion-framer`](../motion-framer/SKILL.md) — base Motion patterns
- [`motion-gsap`](../motion-gsap/SKILL.md) — GSAP for complex timelines
- [`motion-accessibility`](../motion-accessibility/SKILL.md) — reduced-motion
