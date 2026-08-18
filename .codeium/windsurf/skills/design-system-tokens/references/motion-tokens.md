# Motion Tokens

## Duration Scale

Named durations, not magic numbers:

| Token | Value | Usage |
|---|---|---|
| `--duration-instant` | 75ms | Color changes, opacity |
| `--duration-fast` | 150ms | Hover, focus, small UI |
| `--duration-normal` | 250ms | Standard transitions, dropdowns |
| `--duration-slow` | 400ms | Modals, sheets, page sections |
| `--duration-slower` | 600ms | Page transitions, complex sequences |
| `--duration-epic` | 1000ms | Hero animations, onboarding |

## Easing Curves

| Token | Value | Feel |
|---|---|---|
| `--ease-linear` | `linear` | Mechanical, avoid |
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | **Default** — decelerating, natural |
| `--ease-in` | `cubic-bezier(0.7, 0, 0.84, 0)` | Accelerating, exit |
| `--ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` | Symmetric, neutral |
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Bouncy, playful |
| `--ease-elastic` | `cubic-bezier(0.68, -0.55, 0.265, 1.55)` | Elastic overshoot |

## Stagger Scale

For list entrances, staggered reveals:

| Token | Value | Usage |
|---|---|---|
| `--stagger-tight` | 30ms | Dense lists (8+ items) |
| `--stagger-normal` | 50ms | Standard lists (4-8 items) |
| `--stagger-relaxed` | 80ms | Feature cards (2-4 items) |
| `--stagger-dramatic` | 120ms | Hero sections (1-3 items) |

## CSS Implementation

```css
:root {
  /* Durations */
  --duration-instant: 75ms;
  --duration-fast: 150ms;
  --duration-normal: 250ms;
  --duration-slow: 400ms;
  --duration-slower: 600ms;
  --duration-epic: 1000ms;

  /* Easings */
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in: cubic-bezier(0.7, 0, 0.84, 0);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-elastic: cubic-bezier(0.68, -0.55, 0.265, 1.55);

  /* Staggers */
  --stagger-tight: 30ms;
  --stagger-normal: 50ms;
  --stagger-relaxed: 80ms;
  --stagger-dramatic: 120ms;
}
```

## Tailwind Integration

```javascript
// tailwind.config.js
transitionDuration: {
  instant: "75ms",
  fast: "150ms",
  normal: "250ms",
  slow: "400ms",
  slower: "600ms",
  epic: "1000ms",
},
transitionTimingFunction: {
  out: "cubic-bezier(0.16, 1, 0.3, 1)",
  "out-spring": "cubic-bezier(0.34, 1.56, 0.64, 1)",
},
```

## Usage Examples

```css
/* Button hover */
.button {
  transition: transform var(--duration-fast) var(--ease-out),
              box-shadow var(--duration-fast) var(--ease-out);
}
.button:hover {
  transform: translateY(-2px);
}

/* Modal entrance */
.modal {
  transition: opacity var(--duration-normal) var(--ease-out),
              transform var(--duration-normal) var(--ease-spring);
}
```

## Framer Motion Integration

```typescript
// Map tokens to Motion variants
const transitions = {
  fast: { duration: 0.15, ease: [0.16, 1, 0.3, 1] },
  normal: { duration: 0.25, ease: [0.16, 1, 0.3, 1] },
  slow: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
  spring: { type: "spring", stiffness: 400, damping: 25 },
};

const listContainer = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.05 }, // --stagger-normal
  },
};
```
