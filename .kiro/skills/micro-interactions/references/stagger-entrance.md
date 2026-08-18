# Staggered Entrance Animations

## Why Stagger?

When a list appears instantly, it's jarring. Staggering creates a sense of "choreography" — items arrive sequentially, drawing the eye. This is the #1 difference between "AI generated" and "designed by a human".

## CSS-Only Stagger (Simple)

```css
.stagger-item {
  opacity: 0;
  transform: translateY(20px);
  animation: stagger-in 0.4s var(--ease-out) forwards;
}
.stagger-item:nth-child(1) { animation-delay: 0ms; }
.stagger-item:nth-child(2) { animation-delay: 50ms; }
.stagger-item:nth-child(3) { animation-delay: 100ms; }
.stagger-item:nth-child(4) { animation-delay: 150ms; }
.stagger-item:nth-child(5) { animation-delay: 200ms; }

@keyframes stagger-in {
  to { opacity: 1; transform: translateY(0); }
}
```

## Framer Motion Stagger (Recommended)

```tsx
import { motion } from "framer-motion";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05, // --stagger-normal
      delayChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] },
  },
};

function StaggerList({ items }) {
  return (
    <motion.ul variants={container} initial="hidden" animate="show">
      {items.map((item, i) => (
        <motion.li key={i} variants={item}>
          {item.content}
        </motion.li>
      ))}
    </motion.ul>
  );
}
```

## Hero Text Reveal (Word by Word)

```tsx
const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08, delayChildren: 0.2 },
  },
};

const word = {
  hidden: { opacity: 0, y: 30, filter: "blur(8px)" },
  show: {
    opacity: 1, y: 0, filter: "blur(0px)",
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  },
};

function HeroReveal({ text }) {
  const words = text.split(" ");
  return (
    <motion.h1 variants={container} initial="hidden" animate="show"
      className="text-6xl font-bold">
      {words.map((w, i) => (
        <motion.span key={i} variants={word} className="inline-block mr-3">
          {w}
        </motion.span>
      ))}
    </motion.h1>
  );
}
```

## Scroll-Triggered Stagger (Reveal on Scroll)

```tsx
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

function ScrollStagger({ items }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.ul ref={ref} variants={container} initial="hidden" animate={inView ? "show" : "hidden"}>
      {items.map((item, i) => (
        <motion.li key={i} variants={item}>{item.content}</motion.li>
      ))}
    </motion.ul>
  );
}
```

## React Native (Reanimated 3)

```typescript
import Animated, { useAnimatedStyle, withDelay, withTiming, useSharedValue } from "react-native-reanimated";

function StaggerItem({ index, children }) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    opacity.value = withDelay(index * 50, withTiming(1, { duration: 250 }));
    translateY.value = withDelay(index * 50, withTiming(0, { duration: 250 }));
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={style}>{children}</Animated.View>;
}
```

## Stagger Timing Guide

| Items | Stagger Delay | Total Duration |
|---|---|---|
| 2-3 (hero) | 120ms | ~600ms |
| 4-8 (cards) | 50ms | ~500ms |
| 8+ (list) | 30ms | ~500ms |
| 20+ (table) | 15ms | ~400ms |

Keep total under 600ms — longer feels slow.
