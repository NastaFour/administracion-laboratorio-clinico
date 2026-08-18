# Shadow & Elevation System

## Elevation Levels (0-5)

```css
:root {
  --shadow-0: none;
  --shadow-1: 0 1px 2px hsl(0 0% 0% / 0.05);
  --shadow-2: 0 2px 4px hsl(0 0% 0% / 0.08), 0 1px 2px hsl(0 0% 0% / 0.04);
  --shadow-3: 0 4px 8px hsl(0 0% 0% / 0.12), 0 2px 4px hsl(0 0% 0% / 0.06);
  --shadow-4: 0 8px 16px hsl(0 0% 0% / 0.16), 0 4px 8px hsl(0 0% 0% / 0.08);
  --shadow-5: 0 16px 32px hsl(0 0% 0% / 0.20), 0 8px 16px hsl(0 0% 0% / 0.10);
}
```

| Level | Usage |
|---|---|
| 0 | Flat elements, buttons at rest |
| 1 | Cards at rest, subtle separation |
| 2 | Cards on hover, dropdowns |
| 3 | Popovers, tooltips |
| 4 | Modals, floating panels |
| 5 | Overlays above everything |

## Colored Glow Shadows

```css
/* Primary glow */
.glow-primary {
  box-shadow: 0 0 24px hsl(199 89% 48% / 0.3), 0 0 48px hsl(199 89% 48% / 0.15);
}

/* Success glow */
.glow-success {
  box-shadow: 0 0 24px hsl(142 71% 45% / 0.3);
}

/* Neon (double layer for intensity) */
.glow-neon {
  box-shadow:
    0 0 5px hsl(280 90% 65%),
    0 0 20px hsl(280 90% 65% / 0.5),
    0 0 40px hsl(280 90% 65% / 0.3);
}
```

## Inner Shadows

```css
/* Top highlight (glass edge) */
.inner-highlight {
  box-shadow: inset 0 1px 0 hsl(0 0% 100% / 0.15);
}

/* Pressed/inset button */
.inner-pressed {
  box-shadow: inset 0 2px 4px hsl(0 0% 0% / 0.2);
}

/* Inset card (concave) */
.inner-card {
  box-shadow: inset 0 2px 8px hsl(0 0% 0% / 0.15);
  background: hsl(240 10% 12%);
}
```

## Neumorphism

Soft UI with matching bg + dual shadow (light top, dark bottom):

```css
.neumorphic {
  background: hsl(240 10% 15%);
  border-radius: 1rem;
  box-shadow:
    8px 8px 16px hsl(240 10% 8%),    /* dark bottom-right */
    -8px -8px 16px hsl(240 10% 22%);  /* light top-left */
}

.neumorphic-pressed {
  box-shadow:
    inset 4px 4px 8px hsl(240 10% 8%),
    inset -4px -4px 8px hsl(240 10% 22%);
}
```

## Hover Shadow Lift

```css
.card {
  transition: transform 0.2s var(--ease-out), box-shadow 0.2s var(--ease-out);
  box-shadow: var(--shadow-1);
}
.card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-3);
}
```

## CSS 3D Transforms

```css
.card-3d {
  transform-style: preserve-3d;
  perspective: 1000px;
}
.card-3d:hover .card-inner {
  transform: rotateY(15deg) rotateX(5deg);
}

/* Parallax tilt */
.tilt {
  transition: transform 0.3s var(--ease-out);
  transform-style: preserve-3d;
}
```
