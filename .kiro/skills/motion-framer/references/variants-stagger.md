# Variants & Stagger Orchestration

## Variants (Reusable Animation States)

Instead of inline `animate` props, define named states:

```tsx
// BAD: inline (not reusable, hard to orchestrate)
<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} />

// GOOD: variants (reusable, orchestratable)
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, y: -20 },
};

<motion.div variants={fadeUp} initial="hidden" animate="show" exit="exit" />
```

## Propagation (Parent → Children)

When parent changes state, children inherit automatically:

```tsx
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

// Parent controls children — children don't need initial/animate
<motion.ul variants={container} initial="hidden" animate="show">
  <motion.li variants={item}>Item 1</motion.li>
  <motion.li variants={item}>Item 2</motion.li>
  <motion.li variants={item}>Item 3</motion.li>
</motion.ul>
```

## StaggerChildren

Sequential delay between children:

```tsx
const container = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.05, // 50ms between each child
      delayChildren: 0.2,    // wait 200ms before first child
    },
  },
};
```

## Variant Composition (Custom + Shared)

```tsx
const baseVariant = {
  hidden: { opacity: 0 },
  show: { opacity: 1 },
};

// Extend with custom properties
const cardVariant = {
  ...baseVariant,
  hidden: { ...baseVariant.hidden, y: 30, scale: 0.95 },
  show: { ...baseVariant.show, y: 0, scale: 1, transition: { type: "spring", stiffness: 300 } },
};
```

## Dynamic Variants (Based on custom prop)

```tsx
const directionalSlide = {
  enter: (direction) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (direction) => ({
    x: direction > 0 ? -300 : 300,
    opacity: 0,
  }),
};

<motion.div
  custom={direction}
  variants={directionalSlide}
  initial="enter"
  animate="center"
  exit="exit"
/>
```

## UseInView (Scroll-Triggered)

```tsx
import { useInView } from "framer-motion";
import { useRef } from "react";

function RevealOnScroll({ children }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <motion.div
      ref={ref}
      variants={fadeUp}
      initial="hidden"
      animate={inView ? "show" : "hidden"}
    >
      {children}
    </motion.div>
  );
}
```
