# Lottie Optimization

## .lottie vs .json

| Format | Size | Why |
|---|---|---|
| `.json` (Lottie) | 100% (baseline) | Raw JSON, uncompressed |
| `.lottie` (dotLottie) | ~10% of .json | ZIP-compressed + binary |

**Always use .lottie format** when possible.

## Reducing File Size

### 1. Simplify in After Effects

- Reduce keyframes (interpolate instead)
- Remove unused layers
- Lower frame rate (24fps instead of 60fps)
- Avoid expressions (compute before export)
- Reduce shape complexity (fewer path points)

### 2. Optimize with lottiefiles.com

Upload → "Optimize" → download optimized version.

### 3. Strip Unused Assets

```bash
# Remove embedded images from Lottie JSON
# Use lottie-simplify or lottie-json-cleaner
```

## Lazy Loading Strategy

```tsx
// Only load Lottie when needed (e.g., when component is in view)
import { useInView } from "framer-motion";

function LazyLottie({ src }) {
  const ref = useRef(null);
  const inView = useInView(ref, { margin: "100px" });

  return (
    <div ref={ref} className="w-48 h-48">
      {inView && (
        <DotLottieReact src={src} loop autoplay />
      )}
    </div>
  );
}
```

## Static Fallback (Reduced Motion)

```tsx
import { useReducedMotion } from "framer-motion";

function AdaptiveLottie({ src, fallbackImage }) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <img src={fallbackImage} className="w-48 h-48" alt="" />;
  }

  return <DotLottieReact src={src} loop autoplay className="w-48 h-48" />;
}
```

## Preloading Critical Animations

```tsx
// Preload onboarding animations during splash screen
useEffect(() => {
  const animations = ["/animations/welcome.lottie", "/animations/book.lottie"];
  animations.forEach(src => {
    fetch(src); // warm cache
  });
}, []);
```

## Size Budget

| Animation | Max Size | Format |
|---|---|---|
| Onboarding (per step) | 50KB | .lottie |
| Empty state | 30KB | .lottie |
| Success | 40KB | .lottie |
| Loading | 20KB | .lottie |
| Total onboarding (4 steps) | 200KB | .lottie |
