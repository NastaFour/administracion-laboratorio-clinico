# Glassmorphism — Real Implementation

## The Problem with "AI Slop" Glassmorphism

Most AI-generated glassmorphism is just `bg-white/10 backdrop-blur-sm` — which looks like a muddy rectangle. Real glassmorphism needs **5 layers**:

## The 5-Layer Glass Recipe

```css
.glass-card {
  /* Layer 1: Translucent background */
  background: hsl(0 0% 100% / 0.08);

  /* Layer 2: Backdrop blur (the frost effect) */
  backdrop-filter: blur(16px) saturate(180%);
  -webkit-backdrop-filter: blur(16px) saturate(180%);

  /* Layer 3: Border luminosity (edge light refraction) */
  border: 1px solid hsl(0 0% 100% / 0.12);

  /* Layer 4: Inner glow (top edge highlight) */
  box-shadow:
    inset 0 1px 0 hsl(0 0% 100% / 0.15),   /* top highlight */
    0 8px 32px hsl(0 0% 0% / 0.2);          /* drop shadow */

  /* Layer 5: Subtle noise texture overlay (breaks banding) */
  position: relative;
}
.glass-card::before {
  content: "";
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,...noise svg...");
  opacity: 0.03;
  border-radius: inherit;
  pointer-events: none;
}
```

## Tailwind Implementation

```html
<div class="relative rounded-2xl bg-white/8 backdrop-blur-xl backdrop-saturate-150
            border border-white/12 shadow-[inset_0_1px_0_hsl(0_0%_100%_/_0.15),0_8px_32px_hsl(0_0%_0%_/_0.2)]">
  <!-- content -->
</div>
```

## Fallback (No backdrop-filter support)

```css
@supports not (backdrop-filter: blur(16px)) {
  .glass-card {
    background: hsl(0 0% 100% / 0.92); /* near-opaque fallback */
    backdrop-filter: none;
  }
}
```

## Variations

### Dark Glass (for dark mode)

```css
.glass-dark {
  background: hsl(0 0% 0% / 0.4);
  backdrop-filter: blur(20px) saturate(120%);
  border: 1px solid hsl(0 0% 100% / 0.08);
  box-shadow: inset 0 1px 0 hsl(0 0% 100% / 0.1), 0 8px 32px hsl(0 0% 0% / 0.4);
}
```

### Colored Glass (tinted)

```css
.glass-primary {
  background: hsl(199 89% 48% / 0.12);
  backdrop-filter: blur(16px);
  border: 1px solid hsl(199 89% 48% / 0.2);
  box-shadow: inset 0 1px 0 hsl(199 89% 48% / 0.15);
}
```

## Do/Don't

| ✅ Do | ❌ Don't |
|---|---|
| Glass on top of a colorful/gradient background | Glass on flat solid background (invisible) |
| One glass layer per view section | Nested glass inside glass (muddy) |
| `blur(16px)` or `blur(20px)` for real frost | `blur(4px)` (too subtle, looks broken) |
| `saturate(180%)` for vibrant glass | No saturate (looks washed out) |
| Noise overlay to break banding | Skip noise (banding on gradients) |
| Solid fallback for `@supports not` | No fallback (breaks in Firefox old) |

## Blueprint: Premium Hero Section

```html
<!-- Hero with mesh gradient bg + glass card -->
<section class="relative min-h-screen overflow-hidden">
  <!-- Mesh gradient background -->
  <div class="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,hsl(280_90%_65%_/_0.3),transparent),radial-gradient(circle_at_80%_60%,hsl(195_85%_50%_/_0.3),transparent)]"></div>

  <!-- Glass content card -->
  <div class="relative z-10 mx-auto max-w-2xl rounded-3xl bg-white/8 backdrop-blur-xl backdrop-saturate-150 border border-white/12 p-8 shadow-[inset_0_1px_0_hsl(0_0%_100%_/_0.15),0_16px_48px_hsl(0_0%_0%_/_0.3)]">
    <h1 class="text-5xl font-bold text-white">Premium Glass UI</h1>
    <p class="mt-4 text-lg text-white/70">Not your average AI-generated card.</p>
  </div>
</section>
```
