# Reduced Motion Patterns

## WCAG 2.1 SC 2.3.3 — Animation from Interactions

> "Motion animation triggered by interaction can be disabled, unless the animation is essential to the function."

Non-essential animations MUST respect `prefers-reduced-motion: reduce`.

## CSS: prefers-reduced-motion

```css
/* Default: full animation */
.animate-slide {
  transition: transform 0.3s var(--ease-out);
}
.animate-slide:hover {
  transform: translateY(-4px);
}

/* Reduced motion: fade only (no movement) */
@media (prefers-reduced-motion: reduce) {
  .animate-slide {
    transition: opacity 0.2s ease;
    transform: none !important;
  }
  .animate-slide:hover {
    opacity: 0.85;
  }
}
```

## CSS: Universal Reduced-Motion Reset

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

## Tailwind: motion-safe / motion-reduce

```html
<!-- motion-safe: only animate if user allows motion -->
<div class="motion-safe:animate-fade-in motion-reduce:opacity-100">
  Content
</div>

<!-- Hover: motion-safe hover lift, motion-reduce just opacity -->
<button class="
  motion-safe:hover:-translate-y-0.5 motion-safe:transition-transform
  motion-reduce:hover:opacity-80
">
  Button
</button>
```

## Framer Motion: useReducedMotion

```tsx
import { useReducedMotion, motion } from "framer-motion";

function AnimatedCard({ children }) {
  const shouldReduceMotion = useReducedMotion();

  const variants = shouldReduceMotion
    ? {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { duration: 0.2 } },
      }
    : {
        hidden: { opacity: 0, y: 30 },
        show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
      };

  return (
    <motion.div variants={variants} initial="hidden" animate="show">
      {children}
    </motion.div>
  );
}
```

## GSAP: matchMedia

```typescript
useGSAP(() => {
  const mm = gsap.matchMedia();

  mm.add("(prefers-reduced-motion: no-preference)", () => {
    // Full animations
    gsap.from(".item", { y: 60, opacity: 0, stagger: 0.1, duration: 0.6 });
  });

  mm.add("(prefers-reduced-motion: reduce)", () => {
    // Instant, no motion
    gsap.set(".item", { opacity: 1, y: 0 });
  });

  return () => mm.revert();
}, { scope: container });
```

## Reusable Hook: useMotionConfig

```tsx
import { useReducedMotion } from "framer-motion";

export function useMotionConfig() {
  const shouldReduceMotion = useReducedMotion();

  return {
    shouldReduceMotion,
    duration: shouldReduceMotion ? 0 : 0.3,
    ease: shouldReduceMotion ? "linear" : [0.16, 1, 0.3, 1],
    // Fallback variants: fade instead of slide
    variants: shouldReduceMotion
      ? { hidden: { opacity: 0 }, show: { opacity: 1 } }
      : { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } },
  };
}
```

## What Counts as "Essential" Animation?

| Essential (keep even with reduced-motion) | Non-essential (disable with reduced-motion) |
|---|---|
| Loading progress bar | Parallax hero |
| Status indicator (pulse) | Stagger entrance |
| Drag-to-reorder | Card hover lift |
| Video playback control | Scroll storytelling |
| Data viz transition | Page transition slide |

Essential = function. Non-essential = decoration.
