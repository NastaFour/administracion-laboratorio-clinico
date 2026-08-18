# Lazy Loading Patterns

3 patterns for loading heavy dependencies on demand.

## Pattern 1: Singleton Lazy (Bug #9 Fix)

**Problem**: `loadStripe()` at module level runs on every import.

```typescript
// ❌ WRONG — runs on import, even on login page
import { loadStripe } from "@stripe/stripe-js";
const stripe = loadStripe(import.meta.env.VITE_STRIPE_KEY); // executes immediately

export function StripeCheckout() {
  // ... uses stripe
}
```

**Fix**: Wrap in a lazy singleton that only loads when called:

```typescript
// ✅ CORRECT — only loads when getStripe() is called
import { loadStripe, type Stripe } from "@stripe/stripe-js";

let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    const key = import.meta.env.VITE_STRIPE_KEY;
    if (!key) {
      console.warn("VITE_STRIPE_KEY not set, Stripe not loaded");
      return Promise.resolve(null);
    }
    stripePromise = loadStripe(key);
  }
  return stripePromise;
}

export function StripeCheckout() {
  const [stripe, setStripe] = useState<Stripe | null>(null);
  useEffect(() => {
    getStripe().then(setStripe);
  }, []);
  if (!stripe) return <Loading />;
  // ... use stripe
}
```

## Pattern 2: React.lazy() + Suspense (Route-level)

For heavy components like maps, charts, or AI chat:

```typescript
// App.tsx
import { lazy, Suspense } from "react";

const MapPage = lazy(() => import("./pages/MapPage"));
const AIChat = lazy(() => import("./components/AIChat"));

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/map" element={<MapPage />} />
        <Route path="/chat" element={<AIChat />} />
      </Routes>
    </Suspense>
  );
}
```

This creates separate chunks for `MapPage` and `AIChat`, loaded only when the route is visited.

## Pattern 3: Dynamic import() (On-demand)

For non-React code or one-off loads:

```typescript
// Load Leaflet only when map initializes
async function initMap(container: HTMLElement) {
  const L = await import("leaflet");
  const map = L.map(container).setView([10.5, -66.9], 13);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);
  return map;
}
```

## Examples by Library

### Stripe
```typescript
let stripePromise = null;
export function getStripe() {
  if (!stripePromise) {
    const key = import.meta.env.VITE_STRIPE_KEY;
    if (!key) return Promise.resolve(null);
    stripePromise = loadStripe(key);
  }
  return stripePromise;
}
```

### Leaflet
```typescript
let leafletPromise = null;
export function getLeaflet() {
  if (!leafletPromise) {
    leafletPromise = import("leaflet");
  }
  return leafletPromise;
}
```

### LLM SDK
```typescript
let openaiPromise = null;
export function getOpenAI() {
  if (!openaiPromise) {
    openaiPromise = import("openai").then(m => new m.default({ apiKey: import.meta.env.VITE_OPENAI_KEY }));
  }
  return openaiPromise;
}
```

## Verification

After implementing lazy loading, verify the chunk is separate:

```bash
pnpm --filter @scope/web build
# Check dist/assets/ for separate chunk files like:
#   stripe-[hash].js
#   leaflet-[hash].js
```

Or use `rollup-plugin-visualizer`:
```bash
pnpm --filter @scope/web add -D rollup-plugin-visualizer
# Add to vite.config.ts, build, inspect chart
```

## Mobile (Expo) Variant

Expo/Metro supports `React.lazy` and dynamic import similarly:

```typescript
const HeavyScreen = lazy(() => import("./screens/HeavyScreen"));
```

For native modules that are heavy, consider `expo-linear-gradient` or similar — they're already native, so lazy loading is less critical, but `React.lazy` for screens still helps startup time.
