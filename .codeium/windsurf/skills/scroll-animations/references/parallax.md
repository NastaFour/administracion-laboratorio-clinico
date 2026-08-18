# Parallax

## Multi-Layer Parallax Hero

```tsx
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

function ParallaxHero() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });

  // Different layers move at different speeds
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);     // slowest (far)
  const midY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);    // medium
  const fgY = useTransform(scrollYProgress, [0, 1], ["0%", "10%"]);     // fastest (near)
  const textY = useTransform(scrollYProgress, [0, 1], ["0%", "80%"]);   // text scrolls away
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);      // fade out

  return (
    <section ref={ref} className="relative h-screen overflow-hidden">
      {/* Far layer */}
      <motion.div style={{ y: bgY }} className="absolute inset-0 z-0">
        <div className="mesh-animated w-full h-full" />
      </motion.div>

      {/* Mid layer */}
      <motion.div style={{ y: midY }} className="absolute inset-0 z-10 flex items-center justify-center">
        <img src="/mountain.svg" className="w-full opacity-60" />
      </motion.div>

      {/* Near layer */}
      <motion.div style={{ y: fgY }} className="absolute bottom-0 z-20">
        <img src="/foreground.svg" className="w-full" />
      </motion.div>

      {/* Text */}
      <motion.div style={{ y: textY, opacity }} className="relative z-30 flex items-center justify-center h-full">
        <h1 className="text-7xl font-bold">Parallax</h1>
      </motion.div>
    </section>
  );
}
```

## 3D Plane Parallax (Scroll Velocity)

```tsx
import { motion, useScroll, useTransform, useVelocity, useMotionValue } from "framer-motion";

function ScrollVelocity3D() {
  const { scrollY } = useScroll();
  const scrollVelocity = useVelocity(scrollY);

  // Rotate planes based on scroll velocity
  const rotateZ = useTransform(scrollVelocity, [-2000, 2000], [-15, 15]);
  const skewX = useTransform(scrollVelocity, [-2000, 2000], [-10, 10]);

  return (
    <motion.div style={{ rotateZ, skewX }} className="grid grid-cols-3 gap-4">
      {/* 3D plane cards */}
    </motion.div>
  );
}
```

## Infinite Marquee / Ticker

```tsx
function Marquee({ children, speed = 50 }) {
  return (
    <div className="overflow-hidden">
      <motion.div
        className="flex gap-4 whitespace-nowrap"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: speed, repeat: Infinity, ease: "linear" }}
      >
        <div className="flex gap-4">{children}</div>
        <div className="flex gap-4">{children}</div> {/* duplicate for seamless loop */}
      </motion.div>
    </div>
  );
}
```

## Scroll-Snapped Sections

```css
.scroll-snap {
  scroll-snap-type: y mandatory;
  height: 100vh;
  overflow-y: scroll;
}
.scroll-snap > section {
  scroll-snap-align: start;
  height: 100vh;
}
```

## Reduced Motion Fallback

```tsx
import { useReducedMotion } from "framer-motion";

function ParallaxHero() {
  const shouldReduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref });

  // Without parallax: static layers
  const bgY = shouldReduceMotion ? "0%" : useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);

  return (
    <motion.div style={{ y: bgY }}>
      {/* content */}
    </motion.div>
  );
}
```
