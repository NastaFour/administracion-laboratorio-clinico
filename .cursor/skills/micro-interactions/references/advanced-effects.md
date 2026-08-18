# Advanced Effects

## 1. Magnetic Cursor (Button follows mouse)

```tsx
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

function MagneticButton({ children }) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 300, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 300, damping: 20 });

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    mouseX.set(x * 0.3); // 30% magnetic pull
    mouseY.set(y * 0.3);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <motion.button
      style={{ x: springX, y: springY }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="rounded-xl bg-primary px-6 py-3 text-white"
    >
      {children}
    </motion.button>
  );
}
```

## 2. Count Pulse (Number animates up + pulse)

```tsx
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect } from "react";

function CountUp({ target, duration = 1 }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v));

  useEffect(() => {
    const controls = animate(count, target, { duration, ease: [0.16, 1, 0.3, 1] });
    return controls.stop;
  }, [target]);

  return (
    <motion.span
      style={{ scale: count }}
      animate={{ scale: [1, 1.1, 1] }}
      transition={{ duration: 0.4, delay: duration }}
    >
      <motion.span>{rounded}</motion.span>
    </motion.span>
  );
}
```

## 3. Text Reveal (Blur to Sharp)

```tsx
const revealVariant = {
  hidden: { opacity: 0, y: 20, filter: "blur(10px)" },
  show: {
    opacity: 1, y: 0, filter: "blur(0px)",
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  },
};

function TextReveal({ children }) {
  return (
    <motion.div variants={revealVariant} initial="hidden" animate="show">
      {children}
    </motion.div>
  );
}
```

## 4. Tilt Card (3D perspective on hover)

```tsx
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

function TiltCard({ children }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-50, 50], [10, -10]), { stiffness: 200, damping: 20 });
  const rotateY = useSpring(useTransform(x, [-50, 50], [-10, 10]), { stiffness: 200, damping: 20 });

  return (
    <motion.div
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        x.set(e.clientX - rect.left - rect.width / 2);
        y.set(e.clientY - rect.top - rect.height / 2);
      }}
      onMouseLeave={() => { x.set(0); y.set(0); }}
      className="rounded-2xl bg-neutral-900 p-8 [perspective:1000px]"
    >
      {children}
    </motion.div>
  );
}
```

## 5. Tab Indicator (Shared Layout Animation)

```tsx
import { motion, AnimatePresence } from "framer-motion";

function Tabs({ tabs, active, onChange }) {
  return (
    <div className="flex gap-2 relative">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className="relative px-4 py-2"
        >
          {tab.label}
          {active === tab.id && (
            <motion.div
              layoutId="tab-indicator"
              className="absolute inset-0 rounded-lg bg-primary -z-10"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
        </button>
      ))}
    </div>
  );
}
```

## 6. Ripple Effect (Material Design)

```tsx
function Ripple() {
  const [ripples, setRipples] = useState([]);

  const addRipple = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    const id = Date.now();
    setRipples((r) => [...r, { id, x, y, size }]);
    setTimeout(() => setRipples((r) => r.filter((rp) => rp.id !== id)), 600);
  };

  return (
    <button onClick={addRipple} className="relative overflow-hidden">
      Click me
      {ripples.map((r) => (
        <motion.span
          key={r.id}
          initial={{ scale: 0, opacity: 0.4 }}
          animate={{ scale: 4, opacity: 0 }}
          transition={{ duration: 0.6 }}
          style={{ left: r.x, top: r.y, width: r.size, height: r.size }}
          className="absolute rounded-full bg-white/30"
        />
      ))}
    </button>
  );
}
```
