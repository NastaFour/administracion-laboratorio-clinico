# GSAP Timelines

## Basic Timeline

```typescript
import gsap from "gsap";

const tl = gsap.timeline();
tl.to(".box", { x: 100, duration: 0.5 })
  .to(".box", { y: 50, duration: 0.3 })
  .to(".box", { rotation: 90, duration: 0.4 });
```

## Position Parameter (When each tween starts)

```typescript
const tl = gsap.timeline();

// ">" = after previous, "+=0.5" = 0.5s after previous, "<" = same time as previous, "2" = absolute 2s
tl.to(".a", { x: 100, duration: 0.5 }, 0)      // at 0s
  .to(".b", { x: 100, duration: 0.5 }, 0.2)    // at 0.2s (overlap)
  .to(".c", { x: 100, duration: 0.5 }, "<")    // same time as .b
  .to(".d", { x: 100, duration: 0.5 }, "+=1")  // 1s after .c ends
  .to(".e", { x: 100, duration: 0.5 }, "myLabel+=0.5"); // 0.5s after label
```

## Labels

```typescript
const tl = gsap.timeline();
tl.to(".box", { x: 100, duration: 0.5 })
  .addLabel("midpoint")       // named position
  .to(".box", { y: 50, duration: 0.3 }, "midpoint")
  .to(".box", { opacity: 0, duration: 0.4 }, "midpoint+=0.2");
```

## Stagger

```typescript
gsap.from(".items", {
  y: 60,
  opacity: 0,
  duration: 0.5,
  stagger: {
    each: 0.05,           // 50ms between each
    from: "start",        // "start" | "center" | "end" | "edges" | "random"
    grid: "auto",         // for grid layouts
  },
});
```

## Keyframes

```typescript
gsap.to(".box", {
  keyframes: [
    { x: 100, duration: 0.3 },
    { y: 50, duration: 0.2 },
    { rotation: 90, duration: 0.4 },
    { scale: 1.2, duration: 0.2 },
  ],
});
```

## Easing

```typescript
// Built-in
gsap.to(".box", { x: 100, ease: "power3.out" });  // "none" | "power1-4" | "back" | "elastic" | "bounce" | "circ" | "expo" | "sine" | "steps(n)"

// Custom
gsap.to(".box", { x: 100, ease: "CustomEase.create('', '0.16, 1, 0.3, 1')" });

// Rough (adds randomness)
gsap.to(".box", { x: 100, ease: "rough({ template: 'power3.out', strength: 0.5, taper: 'out' })" });
```

## Timeline Controls

```typescript
const tl = gsap.timeline({ paused: true });

tl.play();
tl.pause();
tl.reverse();
tl.restart();
tl.seek(2);              // jump to 2s
tl.timeScale(2);         // 2x speed
tl.progress(0.5);        // jump to 50%
```
