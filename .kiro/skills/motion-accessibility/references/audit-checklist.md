# Motion Audit Checklist

> Use this checklist to audit any page for motion accessibility and performance.

## Accessibility Audit

- [ ] `prefers-reduced-motion: reduce` disables non-essential animations
- [ ] Reduced-motion fallback uses fade (not slide/scale)
- [ ] Essential animations (progress, status) kept even with reduced-motion
- [ ] No autoplay video with motion
- [ ] No parallax without reduced-motion fallback
- [ ] No > 3 flashes per second (seizure risk — WCAG 2.3.1)
- [ ] Focus indicators work with animations (not hidden by transitions)

## Performance Audit

- [ ] Only `transform` and `opacity` animated (no layout properties)
- [ ] No `transition: all`
- [ ] `will-change` used sparingly (added before, removed after)
- [ ] No `box-shadow` animation (use opacity pseudo-element)
- [ ] Max 2 simultaneous animations per viewport
- [ ] No large `backdrop-filter` areas (> 50% viewport)
- [ ] No `filter: blur()` on large elements (use `backdrop-filter`)
- [ ] 60fps confirmed in Chrome DevTools Performance tab
- [ ] No "Layout" (purple) bars in DevTools during animation

## Library-Specific

### Framer Motion
- [ ] `useReducedMotion()` called
- [ ] `variants` used (not inline `animate`)
- [ ] `AnimatePresence` children have `exit` variant
- [ ] No `layout` prop without `LayoutGroup` (if shared)

### GSAP
- [ ] `useGSAP()` or `gsap.context()` used for cleanup
- [ ] `ctx.revert()` called on unmount
- [ ] `gsap.matchMedia()` for responsive + reduced-motion
- [ ] `ScrollTrigger` instances cleaned up

### Lottie
- [ ] `.lottie` format used (not `.json`)
- [ ] Files < 100KB
- [ ] Lazy-loaded (not in initial bundle)
- [ ] Static image fallback for reduced-motion

## MotionScore Audit

1. Go to https://score.motion.dev
2. Enter the page URL
3. Review findings:
   - **S/A**: Excellent — ship it
   - **B/C**: Acceptable — fix what's easy
   - **D/F**: Needs work — fix all findings before shipping

## Quick Fixes for Common Issues

| Issue | Fix |
|---|---|
| Layout thrash (purple bars) | Replace `width`/`height` animation with `transform: scale()` |
| Janky scroll | Add `will-change: transform` to scrolling element |
| Too many animations | Stagger them (don't all fire at once) |
| No reduced-motion | Add `@media (prefers-reduced-motion: reduce)` block |
| Large backdrop-blur | Reduce area or use smaller blur radius |
| `transition: all` | Specify exact properties: `transition: transform, opacity` |
