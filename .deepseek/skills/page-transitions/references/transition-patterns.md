# Transition Patterns — When to Use Each

## Pattern Guide

| Pattern | Duration | Feel | Best for |
|---|---|---|---|
| Fade | 200ms | Subtle, universal | Most route changes |
| Slide (horizontal) | 300ms | Directional, app-like | Wizard steps, tabs |
| Slide (up) | 300ms | Modal-like | Detail pages, forms |
| Scale | 250ms | Focus, zoom-in | Card → detail |
| Flip | 400ms | Dramatic | Settings → main, rarely |
| Morph (shared element) | 350ms | Premium, connected | Image grid → full view |

## Choosing the Right Transition

### Same-level navigation (tabs, sidebar)
→ **Fade** (200ms). Subtle, doesn't distract.

### Hierarchical navigation (list → detail)
→ **Slide horizontal** or **Scale** (300ms). Indicates "going deeper".

### Modal/sheet
→ **Slide up** (300ms). Indicates "overlay above content".

### Back/close
→ **Reverse of enter** (faster, 150-200ms). Exit should be quicker than enter.

## Timing Rules

| Direction | Duration | Why |
|---|---|---|
| Enter | 250-300ms | Give user time to perceive |
| Exit | 150-200ms | Get out of the way quickly |
| Shared element | 300-400ms | Needs time to morph |
| Full page | 300-400ms | Large area needs time |
| Small element | 150-200ms | Small = fast |

## Easing for Transitions

```css
/* Enter: decelerate (ease-out) */
--ease-out: cubic-bezier(0.16, 1, 0.3, 1);

/* Exit: accelerate (ease-in) */
--ease-in: cubic-bezier(0.7, 0, 0.84, 0);

/* Both: spring for physical feel */
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
```

## Anti-Patterns

| ❌ Don't | ✅ Do |
|---|---|
| 500ms+ transitions | 250-300ms (feels instant but smooth) |
| Different transition per route | Consistent transition (muscle memory) |
| Animate every element on page | Animate page wrapper, not children |
| No exit animation (instant disappear) | Always animate exit (even if fast) |
| 3D flip on every navigation | Reserve for special cases |
| Linear easing | Ease-out (enter), ease-in (exit) |
