# Spring Physics & Layout Animations

## Spring vs Tween

Springs feel natural. Tweens feel mechanical. **Always prefer springs for UI**.

```tsx
// BAD: tween (mechanical)
<motion.div animate={{ x: 100 }} transition={{ duration: 0.3, ease: "easeOut" }} />

// GOOD: spring (natural)
<motion.div animate={{ x: 100 }} transition={{ type: "spring", stiffness: 300, damping: 25 }} />
```

## Spring Config Presets

| Preset | Stiffness | Damping | Feel |
|---|---|---|---|
| `snappy` | 400 | 25 | Quick, responsive (buttons, toggles) |
| `gentle` | 200 | 20 | Soft, calm (modals, sheets) |
| `bouncy` | 300 | 12 | Playful, overshoots (success, celebration) |
| `stiff` | 500 | 30 | Rigid, mechanical (sliders, drag) |

```tsx
const springPresets = {
  snappy: { type: "spring", stiffness: 400, damping: 25 },
  gentle: { type: "spring", stiffness: 200, damping: 20 },
  bouncy: { type: "spring", stiffness: 300, damping: 12 },
  stiff: { type: "spring", stiffness: 500, damping: 30 },
};
```

## Layout Animations (`layout` prop)

Animate between any two layouts automatically — no manual transforms needed.

```tsx
// Grid ↔ List toggle
<motion.div layout className="grid grid-cols-3 gap-4">
  {items.map(item => (
    <motion.div layout key={item.id} className="rounded-xl bg-neutral-900 p-4">
      {item.name}
    </motion.div>
  ))}
</motion.div>
```

The `layout` prop tracks position/size changes and animates between them.

## Shared Layout Animations (LayoutGroup)

Animate an element from one position to another across different components:

```tsx
import { LayoutGroup, motion } from "framer-motion";

// Card in list → expanded detail
<LayoutGroup>
  {selectedId === null ? (
    <motion.div layoutId="card" onClick={() => setSelectedId(item.id)}>
      {/* compact card */}
    </motion.div>
  ) : (
    <motion.div layoutId="card" onClick={() => setSelectedId(null)}>
      {/* expanded detail — same layoutId, animates from card position */}
    </motion.div>
  )}
</LayoutGroup>
```

## UseMotionValue + UseTransform

For derived/realtime values:

```tsx
import { useMotionValue, useTransform, useSpring } from "framer-motion";

function ParallaxImage({ mouseX, mouseY }) {
  const springX = useSpring(mouseX, { stiffness: 150, damping: 20 });
  const rotateY = useTransform(springX, [-0.5, 0.5], [-10, 10]);

  return (
    <motion.img
      src={src}
      style={{ rotateY, transformStyle: "preserve-3d" }}
    />
  );
}
```

## Drag with Constraints

```tsx
<motion.div
  drag
  dragConstraints={{ left: 0, right: 300, top: 0, bottom: 300 }}
  dragElastic={0.2}
  whileDrag={{ scale: 1.1, cursor: "grabbing" }}
  className="cursor-grab"
>
  Drag me
</motion.div>
```
