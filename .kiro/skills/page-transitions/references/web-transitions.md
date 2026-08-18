# Web Page Transitions

## React Router + AnimatePresence

```tsx
import { AnimatePresence, motion } from "framer-motion";
import { Routes, Route, useLocation } from "react-router-dom";

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.15 } },
};

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Page><Home /></Page>} />
        <Route path="/about" element={<Page><About /></Page>} />
        <Route path="/contact" element={<Page><Contact /></Page>} />
      </Routes>
    </AnimatePresence>
  );
}

function Page({ children }) {
  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
      {children}
    </motion.div>
  );
}
```

## Directional Transitions (Based on Route)

```tsx
const directionVariants = {
  enter: (direction) => ({ x: direction > 0 ? "100%" : "-100%", opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction) => ({ x: direction > 0 ? "-100%" : "100%", opacity: 0 }),
};

function DirectionalRoutes() {
  const location = useLocation();
  const [direction, setDirection] = useState(0);

  // Determine direction based on route order
  const routeOrder = ["/", "/about", "/contact"];
  useEffect(() => {
    const newIndex = routeOrder.indexOf(location.pathname);
    setDirection(newIndex > prevIndex.current ? 1 : -1);
    prevIndex.current = newIndex;
  }, [location]);

  return (
    <AnimatePresence mode="wait" custom={direction}>
      <motion.div
        key={location.pathname}
        custom={direction}
        variants={directionVariants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        <Routes location={location}>{/* routes */}</Routes>
      </motion.div>
    </AnimatePresence>
  );
}
```

## View Transitions API (Native Browser)

For browsers that support it (Chrome 111+), no library needed:

```tsx
import { useNavigate } from "react-router-dom";

function NavigationLink({ to, children }) {
  const navigate = useNavigate();

  const handleClick = (e) => {
    e.preventDefault();
    if (document.startViewTransition) {
      document.startViewTransition(() => {
        navigate(to);
      });
    } else {
      navigate(to);
    }
  };

  return <a href={to} onClick={handleClick}>{children}</a>;
}
```

```css
/* View transition CSS */
::view-transition-old(root) {
  animation: fade-out 0.25s ease-out forwards;
}
::view-transition-new(root) {
  animation: fade-in 0.25s ease-out forwards;
}
```

## Shared Element Transition (Card → Detail)

```tsx
import { LayoutGroup, motion } from "framer-motion";

function App() {
  const [selectedId, setSelectedId] = useState(null);

  return (
    <LayoutGroup>
      <div className="grid grid-cols-3 gap-4">
        {items.map(item => (
          <motion.div
            layoutId={`card-${item.id}`}
            onClick={() => setSelectedId(item.id)}
            className="rounded-xl bg-neutral-900 p-4 cursor-pointer"
          >
            <motion.h3 layoutId={`title-${item.id}`}>{item.title}</motion.h3>
            <motion.img layoutId={`image-${item.id}`} src={item.image} />
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {selectedId && (
          <motion.div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
            onClick={() => setSelectedId(null)}
          >
            <motion.div layoutId={`card-${selectedId}`} className="max-w-2xl bg-neutral-900 rounded-2xl p-8">
              <motion.h3 layoutId={`title-${selectedId}`} className="text-3xl" />
              <motion.img layoutId={`image-${selectedId}`} className="w-full" />
              <p>{selectedItem.description}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </LayoutGroup>
  );
}
```
