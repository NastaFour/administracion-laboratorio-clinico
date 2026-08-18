# GSAP ScrollTrigger

## When to Use GSAP Instead of Motion

| Feature | Motion | GSAP ScrollTrigger |
|---|---|---|
| Simple reveal | ✅ useInView | Overkill |
| Parallax | ✅ useScroll | ✅ |
| Pin section | ❌ | ✅ pin: true |
| Scrub (animation tied to scroll position) | Partial | ✅ scrub: true |
| Snap (force scroll to section) | ❌ | ✅ snap |
| Batch (animate multiple items on enter) | Manual | ✅ batch() |
| Horizontal scroll on vertical scroll | ❌ | ✅ |

## Basic ScrollTrigger

```tsx
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger, useGSAP);

function ScrollReveal() {
  const container = useRef(null);

  useGSAP(() => {
    gsap.from(".reveal-item", {
      opacity: 0,
      y: 60,
      duration: 0.8,
      ease: "power3.out",
      stagger: 0.1,
      scrollTrigger: {
        trigger: ".reveal-section",
        start: "top 80%",  // when top of section hits 80% of viewport
        end: "bottom 20%",
        toggleActions: "play none none reverse", // onEnter, onLeave, onEnterBack, onLeaveBack
      },
    });
  }, { scope: container });

  return (
    <div ref={container} className="reveal-section">
      <div className="reveal-item">Item 1</div>
      <div className="reveal-item">Item 2</div>
    </div>
  );
}
```

## Pinned Section (Scroll Storytelling)

```tsx
useGSAP(() => {
  gsap.to(".pinned-content", {
    x: "-75%", // horizontal scroll through 4 panels
    ease: "none",
    scrollTrigger: {
      trigger: ".pin-container",
      start: "top top",
      end: "+=300%", // 3 viewport heights of scroll
      scrub: 1, // smooth scrubbing (1 second catch-up)
      pin: true, // pin the section
    },
  });
}, { scope: container });
```

## Scrub (Animation Tied to Scroll Position)

```tsx
useGSAP(() => {
  gsap.to(".progress-bar", {
    scaleX: 1,
    ease: "none",
    scrollTrigger: {
      trigger: "body",
      start: "top top",
      end: "bottom bottom",
      scrub: true, // 1:1 with scroll (no smoothing)
    },
  });
}, { scope: container });
```

## Batch (Animate Items as They Enter)

```tsx
useGSAP(() => {
  ScrollTrigger.batch(".batch-item", {
    start: "top 90%",
    onEnter: (batch) => gsap.from(batch, { opacity: 0, y: 50, stagger: 0.1, duration: 0.6 }),
  });
}, { scope: container });
```

## Cleanup (CRITICAL)

```tsx
useGSAP(() => {
  const ctx = gsap.context(() => {
    // all GSAP animations here
    gsap.from(".item", { scrollTrigger: { ... } });
  }, container);

  return () => ctx.revert(); // kills all ScrollTriggers created inside
}, { scope: container });
```

## matchMedia (Responsive + Reduced Motion)

```tsx
useGSAP(() => {
  let mm = gsap.matchMedia();

  mm.add("(prefers-reduced-motion: no-preference)", () => {
    // Full animations
    gsap.from(".item", { y: 60, opacity: 0, scrollTrigger: { ... } });
  });

  mm.add("(prefers-reduced-motion: reduce)", () => {
    // No animation, just show
    gsap.set(".item", { opacity: 1 });
  });

  return () => mm.revert();
}, { scope: container });
```
