# Lottie Integration

## Web: lottie-react

```bash
pnpm --filter @myorg/web add lottie-react
```

```tsx
import Lottie from "lottie-react";
import successAnimation from "./animations/success.json";

function SuccessState() {
  return <Lottie animationData={successAnimation} loop={false} autoplay className="w-48 h-48" />;
}
```

## Web: @lottiefiles/dotlottie-react (Recommended — 90% smaller)

```bash
pnpm --filter @myorg/web add @lottiefiles/dotlottie-react
```

```tsx
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

function SuccessState() {
  return (
    <DotLottieReact
      src="/animations/success.lottie"
      loop={false}
      autoplay
      className="w-48 h-48"
    />
  );
}
```

## Mobile (Expo): lottie-react-native

```bash
pnpm --filter @myorg/mobile expo install lottie-react-native
```

```tsx
import LottieView from "lottie-react-native";

function SuccessState() {
  return (
    <LottieView
      source={require("./animations/success.json")}
      autoPlay
      loop={false}
      style={{ width: 200, height: 200 }}
    />
  );
}
```

## Lazy Loading (Performance)

```tsx
import { lazy, Suspense } from "react";

const LottieSuccess = lazy(() => import("./LottieSuccess"));

function App() {
  return (
    <Suspense fallback={<div className="w-48 h-48" />}>
      {showSuccess && <LottieSuccess />}
    </Suspense>
  );
}

// LottieSuccess.tsx
import Lottie from "lottie-react";
import successAnimation from "./animations/success.json";
export default function LottieSuccess() {
  return <Lottie animationData={successAnimation} loop={false} />;
}
```

## Interactive Controls

```tsx
import { useRef } from "react";
import Lottie, { LottieRefCurrentProps } from "lottie-react";

function ControlledAnimation() {
  const ref = useRef<LottieRefCurrentProps>(null);

  return (
    <div>
      <Lottie
        lottieRef={ref}
        animationData={animation}
        loop={false}
        autoplay={false}
      />
      <button onClick={() => ref.current?.play()}>Play</button>
      <button onClick={() => ref.current?.pause()}>Pause</button>
      <button onClick={() => ref.current?.setSpeed(2)}>2x Speed</button>
      <button onClick={() => ref.current?.goToAndStop(50, false)}>Frame 50</button>
    </div>
  );
}
```

## Segmented Animation (One File, Multiple States)

```tsx
// One Lottie file with segments for different states
const segments = {
  idle: [0, 30],
  loading: [30, 60],
  success: [60, 90],
  error: [90, 120],
};

function StateAnimation({ state }) {
  const ref = useRef<LottieRefCurrentProps>(null);

  useEffect(() => {
    const [start, end] = segments[state];
    ref.current?.playSegments([start, end], true);
  }, [state]);

  return <Lottie lottieRef={ref} animationData={multiStateAnim} loop={state === "loading"} />;
}
```
