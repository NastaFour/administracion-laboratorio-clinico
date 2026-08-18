# Skeleton Shimmer

## Why Shimmer?

A blank gray box says "broken". A shimmering skeleton says "loading, content coming". The sweep of light creates a sense of progress.

## CSS Shimmer (Gradient Sweep)

```css
.skeleton {
  background: linear-gradient(
    90deg,
    hsl(0 0% 15%) 0%,
    hsl(0 0% 25%) 50%,
    hsl(0 0% 15%) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: var(--radius-md);
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
```

## Tailwind Shimmer

```html
<div class="relative overflow-hidden rounded-lg bg-neutral-800">
  <div class="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
</div>
```

```css
/* tailwind.config.js keyframes */
keyframes: {
  shimmer: {
    "100%": { transform: "translateX(100%)" },
  },
}
```

## Skeleton Component (React)

```tsx
function Skeleton({ className = "" }) {
  return (
    <div className={`relative overflow-hidden rounded-lg bg-neutral-800 ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite]
                      bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
  );
}

// Usage: shapes that match content
function CardSkeleton() {
  return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-6 w-3/4" /> {/* title */}
      <Skeleton className="h-4 w-full" /> {/* text line 1 */}
      <Skeleton className="h-4 w-5/6" /> {/* text line 2 */}
      <Skeleton className="h-32 w-full" /> {/* image */}
    </div>
  );
}
```

## Pulse (Alternative to Shimmer)

```css
.pulse {
  animation: pulse 2s infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

```html
<div class="animate-pulse rounded-lg bg-neutral-800 h-6 w-3/4"></div>
```

## Shimmer vs Pulse

| Effect | Feel | Best for |
|---|---|---|
| Shimmer (sweep) | Active, progressing | Cards, avatars, content blocks |
| Pulse (fade) | Passive, waiting | Full-page loaders, simple placeholders |

## Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  .skeleton {
    animation: none;
    background: hsl(0 0% 15%); /* static gray */
  }
}
```
