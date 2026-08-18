# AnimatePresence — Exit Animations

## The Problem

When React removes an element from the DOM, it disappears instantly. `AnimatePresence` keeps it alive long enough to animate out.

## Basic Exit Animation

```tsx
import { AnimatePresence, motion } from "framer-motion";

function Modal({ isOpen, onClose }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center"
        >
          <div className="bg-neutral-900 rounded-2xl p-8">
            Modal content
            <button onClick={onClose}>Close</button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

## mode="wait" (Sequential)

Waits for exit to finish before mounting next:

```tsx
<AnimatePresence mode="wait">
  {step === 1 && (
    <motion.div key="step1" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
      Step 1
    </motion.div>
  )}
  {step === 2 && (
    <motion.div key="step2" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
      Step 2
    </motion.div>
  )}
</AnimatePresence>
```

## mode="popLayout" (Layout-aware)

Exits without shifting remaining items:

```tsx
<AnimatePresence mode="popLayout">
  {items.map(item => (
    <motion.div
      key={item.id}
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
    >
      {item.content}
    </motion.div>
  ))}
</AnimatePresence>
```

## Page Transitions with AnimatePresence

```tsx
import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "react-router-dom";

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><Home /></PageTransition>} />
        <Route path="/about" element={<PageTransition><About /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
}

function PageTransition({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
```

## Common Exit Patterns

| Pattern | initial | exit | Use case |
|---|---|---|---|
| Fade | `opacity: 0` | `opacity: 0` | Subtle, universal |
| Scale down | `scale: 0.95` | `scale: 0.95` | Modals, popovers |
| Slide up | `y: 20` | `y: -20` | Sheets, notifications |
| Slide left | `x: 100` | `x: -100` | Carousel, wizard |
| Collapse | `height: 0` | `height: 0` | Accordion (use `layout`) |
