# Animation Performance — 60fps Rules

## The 60fps Budget

60fps = 16.67ms per frame. If an animation takes > 16ms per frame, it drops frames → janky.

## What's GPU-Accelerated (Use These)

| Property | GPU? | Use |
|---|---|---|
| `transform: translate()` | ✅ | Movement |
| `transform: scale()` | ✅ | Size |
| `transform: rotate()` | ✅ | Rotation |
| `opacity` | ✅ | Visibility |
| `filter: blur()` (backdrop) | ✅ | Glass effect |

## What Forces Layout (Avoid These)

| Property | Reflow? | Why bad |
|---|---|---|
| `width` / `height` | ✅ Layout | Recalculates all element sizes |
| `top` / `left` | ✅ Layout | Recalculates positions |
| `margin` / `padding` | ✅ Layout | Recalculates spacing |
| `border-width` | ✅ Layout | Recalculates rendering |
| `box-shadow` (spread) | ✅ Paint | Repaints large area |

## will-change (Use Sparingly)

Tells the browser "this element will change" → browser preps GPU layer.

```css
/* GOOD: add before animation, remove after */
.card {
  will-change: transform; /* only when about to animate */
}
.card:hover {
  transform: translateY(-4px);
}

/* BAD: never remove → memory leak */
.card {
  will-change: transform; /* always on = wasted memory */
}
```

```tsx
// React: add will-change on hover, remove on leave
function Card() {
  const [isHovering, setIsHovering] = useState(false);
  return (
    <div
      style={{ willChange: isHovering ? "transform" : "auto" }}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      className="transition-transform hover:-translate-y-1"
    >
      Content
    </div>
  );
}
```

## contain: layout (Isolate Reflows)

```css
.card-list {
  contain: layout; /* reflows inside don't affect outside */
}
```

## Common Performance Killers

### 1. `transition: all`

```css
/* BAD: animates EVERY property */
.card { transition: all 0.3s; }

/* GOOD: only animate what changes */
.card { transition: transform 0.3s, opacity 0.3s; }
```

### 2. Box-shadow animation

```css
/* BAD: repaints large area every frame */
.card { transition: box-shadow 0.3s; }

/* GOOD: use filter: drop-shadow or transform + pseudo-element */
.card::after {
  content: "";
  position: absolute;
  inset: 0;
  opacity: 0;
  box-shadow: var(--shadow-3);
  transition: opacity 0.3s;
}
.card:hover::after { opacity: 1; }
```

### 3. Too many simultaneous animations

Rule of thumb: **max 2 simultaneous animations per viewport**. More overwhelms the GPU compositor.

### 4. Large backdrop-filter areas

```css
/* BAD: full-page backdrop blur = GPU killer */
.full-page-glass {
  backdrop-filter: blur(20px);
  /* applied to a 100vh element */
}

/* GOOD: small glass cards */
.glass-card {
  backdrop-filter: blur(20px);
  /* applied to a 300px card */
}
```

## Measuring Performance

### Chrome DevTools

1. F12 → Performance tab
2. Record while animating
3. Look for:
   - **Purple** bars = Layout (bad)
   - **Green** bars = Paint (acceptable)
   - Frames > 16ms = janky

### MotionScore (motion.dev)

Audit any URL: https://score.motion.dev

Grades S through F, finds performance issues, suggests fixes.

## Performance Checklist

- [ ] Only animating `transform` and `opacity`
- [ ] No `transition: all`
- [ ] `will-change` only on hover/active elements
- [ ] Max 2 simultaneous animations per viewport
- [ ] No large `backdrop-filter` areas
- [ ] No box-shadow animation (use opacity pseudo-element)
- [ ] `prefers-reduced-motion` respected
- [ ] 60fps confirmed in DevTools
