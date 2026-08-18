# SVG & Text Animation

## SplitText (Text Reveal)

Splits text into chars/words/lines for individual animation:

```typescript
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(SplitText);

// Split into characters
const split = new SplitText(".hero-text", { type: "chars, words" });

gsap.from(split.chars, {
  opacity: 0,
  y: 30,
  rotationX: -90,
  stagger: 0.02,
  duration: 0.6,
  ease: "power3.out",
  scrollTrigger: {
    trigger: ".hero-text",
    start: "top 80%",
  },
});
```

### Word-by-Word Reveal with Blur

```typescript
const split = new SplitText(".hero-text", { type: "words" });

gsap.from(split.words, {
  opacity: 0,
  filter: "blur(10px)",
  y: 20,
  stagger: 0.08,
  duration: 0.5,
  ease: "power3.out",
});
```

## DrawSVG (Path Drawing)

Animates the "drawing" of an SVG path:

```typescript
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";

gsap.registerPlugin(DrawSVGPlugin);

// Draw a line from 0 to 100%
gsap.fromTo(".path",
  { drawSVG: "0%" },
  {
    drawSVG: "100%",
    duration: 2,
    ease: "power2.inOut",
    scrollTrigger: {
      trigger: ".svg-container",
      start: "top 70%",
    },
  }
);

// Draw in segments
gsap.fromTo(".path",
  { drawSVG: "0% 20%" },
  { drawSVG: "80% 100%", duration: 1.5 }
);
```

## MorphSVG (Shape Morphing)

Morphs between two SVG paths:

```typescript
import { MorphSVGPlugin } from "gsap/MorphSVGPlugin";

gsap.registerPlugin(MorphSVGPlugin);

// Morph circle → star
gsap.to("#circle", {
  morphSVG: "#star",
  duration: 1,
  ease: "power2.inOut",
});

// Morph to a specific path string
gsap.to("#shape", {
  morphSVG: "M10,10 L90,10 L50,90 Z",
  duration: 1,
});
```

## MotionPath (Path Following)

Animate an element along an SVG path:

```typescript
import { MotionPathPlugin } from "gsap/MotionPathPlugin";

gsap.registerPlugin(MotionPathPlugin);

gsap.to(".dot", {
  duration: 3,
  ease: "none",
  motionPath: {
    path: "#motion-path",  // SVG path to follow
    align: "#motion-path",
    alignOrigin: [0.5, 0.5],
  },
});
```

## Blueprint: Hero Text Reveal

```typescript
useGSAP(() => {
  const split = new SplitText(".hero-title", { type: "chars, words" });

  const tl = gsap.timeline({
    scrollTrigger: { trigger: ".hero", start: "top 70%" },
  });

  tl.from(split.chars, {
    opacity: 0,
    y: 40,
    rotationX: -90,
    stagger: 0.03,
    duration: 0.5,
    ease: "power3.out",
  })
  .from(".hero-subtitle", {
    opacity: 0,
    y: 20,
    duration: 0.4,
    ease: "power2.out",
  }, "-=0.3")
  .from(".hero-cta", {
    opacity: 0,
    scale: 0.8,
    duration: 0.3,
    ease: "back.out(1.7)",
  }, "-=0.2");
}, { scope: container });
```
