# Gradients, Blend Modes & Masks

## Mesh Gradient (Multi-Point Aurora)

The signature of premium backgrounds. Not a linear gradient — multiple radial points blended:

```css
.mesh-bg {
  background:
    radial-gradient(circle at 20% 20%, hsl(280 90% 65% / 0.4), transparent 50%),
    radial-gradient(circle at 80% 60%, hsl(195 85% 50% / 0.4), transparent 50%),
    radial-gradient(circle at 50% 100%, hsl(25 85% 55% / 0.3), transparent 50%),
    hsl(240 10% 8%); /* base dark */
}
```

### Animated Mesh (CSS Only)

```css
.mesh-animated {
  background:
    radial-gradient(circle at 20% 20%, hsl(280 90% 65% / 0.4), transparent 50%),
    radial-gradient(circle at 80% 60%, hsl(195 85% 50% / 0.4), transparent 50%),
    radial-gradient(circle at 50% 100%, hsl(25 85% 55% / 0.3), transparent 50%);
  background-size: 200% 200%;
  animation: mesh-shift 15s ease-in-out infinite;
}

@keyframes mesh-shift {
  0%, 100% { background-position: 0% 0%, 100% 100%, 50% 50%; }
  50% { background-position: 30% 70%, 70% 30%, 50% 50%; }
}
```

## Conic Gradient (Pie Sweep)

```css
.conic-border {
  border: 2px solid transparent;
  background:
    linear-gradient(hsl(240 10% 8%), hsl(240 10% 8%)) padding-box,
    conic-gradient(from 0deg, hsl(280 90% 65%), hsl(195 85% 50%), hsl(25 85% 55%), hsl(280 90% 65%)) border-box;
}
```

## Blend Modes

```css
/* Screen: lightens (good for glows on dark bg) */
.glow {
  mix-blend-mode: screen;
}

/* Multiply: darkens (good for texture overlays on light bg) */
.texture-overlay {
  mix-blend-mode: multiply;
  opacity: 0.1;
}

/* Difference: inverts (good for striking art effects) */
.art-layer {
  mix-blend-mode: difference;
}
```

## CSS Masks

```css
/* Fade out bottom of element */
.fade-bottom {
  mask-image: linear-gradient(to bottom, black 70%, transparent 100%);
  -webkit-mask-image: linear-gradient(to bottom, black 70%, transparent 100%);
}

/* Text clip to gradient */
.gradient-text {
  background: linear-gradient(135deg, hsl(280 90% 65%), hsl(195 85% 50%));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
```

## Noise Texture (Breaks Banding)

Gradients on large areas show banding. Add noise:

```css
.noise-overlay::after {
  content: "";
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><filter id='n'><feTurbulence baseFrequency='0.9' numOctaves='3'/></filter><rect width='100' height='100' filter='url(%23n)' opacity='0.5'/></svg>");
  opacity: 0.04;
  pointer-events: none;
  mix-blend-mode: overlay;
}
```

## Blueprint: Aurora Hero

```html
<section class="relative min-h-screen overflow-hidden bg-neutral-950">
  <div class="absolute inset-0 mesh-animated"></div>
  <div class="absolute inset-0 noise-overlay"></div>
  <div class="relative z-10 flex items-center justify-center min-h-screen">
    <h1 class="text-7xl font-bold gradient-text">Aurora</h1>
  </div>
</section>
```
