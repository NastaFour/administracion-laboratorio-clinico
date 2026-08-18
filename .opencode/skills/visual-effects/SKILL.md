---
name: visual-effects
description: Premium visual effects for non-generic UIs — glassmorphism (real backdrop-blur + layering), mesh/aurora gradients, blend modes, shadow/elevation systems, neumorphism, CSS 3D transforms, and noise textures. Use when a design looks "too flat/generic" and needs depth, when implementing glass cards, or when adding premium visual polish that separates AI slop from production-grade design.
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires Node 20+."
metadata:
  trigger: ["glassmorphism", "backdrop blur", "glass card", "premium ui", "visual effects", "gradient mesh", "aurora", "blend mode", "neumorphism", "3d transform", "noise texture", "depth", "glassmorfismo", "efectos visuales", "depth of field", "visual polish"]
  scope: [global, project]
  version: "1.0.0"
allowed-tools: Bash(node:*) Read
---

# ✨ Visual Effects (Premium UI)

The difference between "AI slop" and premium design. Covers glassmorphism (real implementation, not just a keyword), mesh gradients, blend modes, shadow systems, neumorphism, 3D transforms, and noise textures.

## 📋 When to Use

- Use when a design looks too flat, generic, or "AI-generated"
- Use when implementing glass cards, frosted panels, or backdrop blur
- Use when adding mesh/aurora gradient backgrounds
- Use when creating depth with shadows/elevation
- Do NOT use for every element — effects should be accents, not everywhere

## 🚦 Hard Rules

- **Always** provide a solid fallback for `backdrop-blur` (older browsers)
- **Never** use `opacity: 0.5` on background without a color underneath
- **Always** use `hsl()` with alpha for transparency (`hsl(0 0% 100% / 0.1)`)
- **Never** nest glassmorphism inside glassmorphism (muddy, unreadable)
- **Always** use `transform` and `opacity` for animations (GPU-accelerated, never `width`/`height`/`top`)
- **Never** use `filter: blur()` on large elements (performance killer — use `backdrop-filter` instead)

## 🛠️ Workflow

1. Read glassmorphism implementation: [glassmorphism.md](references/glassmorphism.md)
2. Read gradients + blend modes: [gradients-blends.md](references/gradients-blends.md)
3. Read shadow/elevation system: [shadow-elevation.md](references/shadow-elevation.md)
4. Run the checker to detect missing fallbacks:
   ```bash
   node ./.opencode/skills/visual-effects/scripts/check-effects.mjs
   ```

## 📚 References

- [Glassmorphism](references/glassmorphism.md) — real backdrop-blur + layering + noise
- [Gradients & Blends](references/gradients-blends.md) — mesh, aurora, conic, blend modes, masks
- [Shadow & Elevation](references/shadow-elevation.md) — elevation system, neumorphism, inner shadows
- [`design-system-tokens`](../design-system-tokens/SKILL.md) — shadow tokens
- [`tailwindcss`](../tailwindcss/SKILL.md) — Tailwind utility integration
- [`micro-interactions`](../micro-interactions/SKILL.md) — hover lift uses shadow tokens
