# Flip — Layout Transitions

## What Flip Does

Flip (First, Last, Invert, Play) animates between two layout states without manual transforms. Change the DOM, then let Flip figure out the animation.

## Basic Flip

```typescript
import gsap from "gsap";
import { Flip } from "gsap/Flip";

gsap.registerPlugin(Flip);

function toggleLayout() {
  // 1. Capture the FIRST state (before change)
  const state = Flip.getState(".cards");

  // 2. Change the DOM (e.g., add/remove class, change grid)
  container.classList.toggle("grid-view");
  container.classList.toggle("list-view");

  // 3. Animate from FIRST to LAST
  Flip.from(state, {
    duration: 0.5,
    ease: "power2.inOut",
    absolute: true,
    stagger: 0.05,
  });
}
```

## Grid → List Toggle

```typescript
const gridBtn = document.querySelector("#grid-view");
const listBtn = document.querySelector("#list-view");

gridBtn.addEventListener("click", () => {
  const state = Flip.getState(".card");
  container.className = "grid grid-cols-3 gap-4";
  Flip.from(state, { duration: 0.4, stagger: 0.03, ease: "power2.out" });
});

listBtn.addEventListener("click", () => {
  const state = Flip.getState(".card");
  container.className = "flex flex-col gap-4";
  Flip.from(state, { duration: 0.4, stagger: 0.03, ease: "power2.out" });
});
```

## Filter Animation

```typescript
function filterCards(category) {
  const state = Flip.getState(".card");

  // Hide/show cards based on category
  cards.forEach(card => {
    card.style.display = card.dataset.category === category ? "block" : "none";
  });

  Flip.from(state, {
    duration: 0.4,
    ease: "power2.inOut",
    stagger: 0.05,
    scale: true,
  });
}
```

## React + Flip

```tsx
import { useGSAP } from "@gsap/react";
import { Flip } from "gsap/Flip";
import { useRef, useState } from "react";

function Gallery({ images }) {
  const container = useRef(null);
  const [view, setView] = useState("grid");

  const toggleView = () => {
    const state = Flip.getState(".gallery-item", container.current);
    setView(view === "grid" ? "list" : "grid");

    // Animate after React re-renders
    requestAnimationFrame(() => {
      Flip.from(state, {
        duration: 0.4,
        stagger: 0.04,
        ease: "power2.inOut",
        scope: container.current,
      });
    });
  };

  return (
    <div ref={container}>
      <button onClick={toggleView}>Toggle</button>
      <div className={view === "grid" ? "grid grid-cols-3 gap-4" : "flex flex-col gap-4"}>
        {images.map(img => (
          <div key={img.id} className="gallery-item rounded-xl bg-neutral-900 p-4">
            {img.title}
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Flip with ScrollTrigger (Enter/Exit)

```typescript
useGSAP(() => {
  ScrollTrigger.create({
    trigger: ".gallery-section",
    start: "top 80%",
    onEnter: () => {
      const state = Flip.getState(".gallery-item");
      // Change layout (e.g., from hidden to visible grid)
      gsap.set(".gallery-item", { display: "block" });
      Flip.from(state, { duration: 0.6, stagger: 0.05, ease: "power3.out" });
    },
  });
}, { scope: container });
```
