# Hover, Press, Focus States

## 1. Hover Lift (Button/Card)

```css
/* CSS */
.lift {
  transition: transform 150ms var(--ease-out), box-shadow 150ms var(--ease-out);
}
.lift:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-3);
}
```

```html
<!-- Tailwind -->
<button class="transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-lg">
  Hover me
</button>
```

## 2. Press Scale (Tactile Feedback)

```css
/* CSS */
.press {
  transition: transform 100ms var(--ease-out);
}
.press:active {
  transform: scale(0.97);
}
```

```html
<!-- Tailwind -->
<button class="transition-transform duration-100 active:scale-[0.97]">
  Press me
</button>
```

## 3. Focus Glow (Accessibility)

```css
/* CSS */
.focus-glow:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px hsl(199 89% 48% / 0.5);
}
```

```html
<!-- Tailwind -->
<button class="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950">
  Focus me
</button>
```

## 4. Combined Button (Hover + Press + Focus)

```html
<button class="
  transition-[transform,box-shadow] duration-150
  hover:-translate-y-0.5 hover:shadow-lg
  active:scale-95 active:translate-y-0
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50
">
  Premium Button
</button>
```

## 5. Card Hover (Lift + Border Glow)

```html
<div class="
  group rounded-2xl border border-white/10 p-6
  transition-all duration-250
  hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_8px_32px_hsl(199_89%_48%_/_0.15)]
">
  <h3 class="group-hover:text-primary transition-colors duration-150">Card Title</h3>
  <p class="text-white/60">Content changes color on hover</p>
</div>
```

## React Native (Reanimated 3)

```typescript
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withSequence } from "react-native-reanimated";

function PressableCard() {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPressIn={() => { scale.value = withSpring(0.97, { damping: 15 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 15 }); }}
    >
      <Animated.View style={animatedStyle}>
        {/* card content */}
      </Animated.View>
    </Pressable>
  );
}
```

## Do/Don't

| ✅ Do | ❌ Don't |
|---|---|
| `transform: translateY(-2px)` on hover | `margin-top: -2px` (forces reflow) |
| `transform: scale(0.97)` on press | `width: 95%` (janky, forces layout) |
| `box-shadow` change on hover | `border-width` change (forces layout) |
| `transition: transform 150ms` | `transition: all 150ms` (animates everything = slow) |
| `:focus-visible` (keyboard only) | `:focus` (fires on mouse click too) |
