# GSAP + React Integration

## useGSAP Hook (Recommended)

```typescript
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

function MyComponent() {
  const container = useRef(null);

  useGSAP(() => {
    // All animations scoped to container
    gsap.from(".item", { opacity: 0, y: 30, stagger: 0.1 });
  }, { scope: container }); // scope = ref to container

  return <div ref={container}>{/* content */}</div>;
}
```

## gsap.context() (Manual Cleanup)

If not using `useGSAP`:

```typescript
useEffect(() => {
  const ctx = gsap.context(() => {
    gsap.from(".item", { y: 30 });
  }, container); // scoped

  return () => ctx.revert(); // CRITICAL: cleanup
}, []);
```

## matchMedia (Responsive + Reduced Motion)

```typescript
useGSAP(() => {
  const mm = gsap.matchMedia();

  // Desktop with motion
  mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
    gsap.from(".hero-text", { y: 60, opacity: 0, duration: 0.8, scrollTrigger: { ... } });
  });

  // Mobile or reduced motion: no animation, just show
  mm.add("(max-width: 767px), (prefers-reduced-motion: reduce)", () => {
    gsap.set(".hero-text", { opacity: 1, y: 0 });
  });

  return () => mm.revert();
}, { scope: container });
```

## ScrollTrigger Cleanup

```typescript
useGSAP(() => {
  const triggers = [];

  // Store triggers for cleanup
  const trigger = ScrollTrigger.create({
    trigger: ".section",
    start: "top 80%",
    onEnter: () => gsap.from(".item", { y: 30 }),
  });
  triggers.push(trigger);

  // useGSAP auto-cleans via context
}, { scope: container });
```

## Common Patterns

### Staggered Card Entrance

```typescript
useGSAP(() => {
  gsap.from(".card", {
    opacity: 0,
    y: 40,
    duration: 0.5,
    stagger: 0.08,
    ease: "power3.out",
    scrollTrigger: {
      trigger: ".card-grid",
      start: "top 75%",
    },
  });
}, { scope: container });
```

### Hover Effect (GSAP)

```typescript
useGSAP(() => {
  const cards = gsap.utils.toArray(".card");
  cards.forEach(card => {
    gsap.to(card, {
      y: -6,
      boxShadow: "0 12px 32px hsl(0 0% 0% / 0.2)",
      duration: 0.2,
      ease: "power2.out",
      paused: true,
    });

    card.addEventListener("mouseenter", () => gsap.to(card, { y: -6, duration: 0.2 }));
    card.addEventListener("mouseleave", () => gsap.to(card, { y: 0, duration: 0.2 }));
  });
}, { scope: container });
```

### Text Scramble on Hover

```typescript
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";

useGSAP(() => {
  document.querySelectorAll(".scramble").forEach(el => {
    el.addEventListener("mouseenter", () => {
      gsap.to(el, {
        duration: 0.5,
        scrambleText: { text: el.textContent, chars: "01", speed: 0.3 },
        ease: "none",
      });
    });
  });
}, { scope: container });
```
