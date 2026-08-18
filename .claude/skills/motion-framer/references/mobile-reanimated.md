# React Native Reanimated 3 (Mobile)

## Why Reanimated (Not framer-motion on mobile)

Reanimated runs animations on the **UI thread** (60fps). Framer-motion runs on the JS thread → janky on mobile.

## Core APIs

### useSharedValue

```typescript
import { useSharedValue, withSpring } from "react-native-reanimated";

function PressableCard() {
  const scale = useSharedValue(1);

  return (
    <Pressable
      onPressIn={() => { scale.value = withSpring(0.97, { damping: 15 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 15 }); }}
    >
      <Animated.View style={[styles.card, useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))]}>
        <Text>Card</Text>
      </Animated.View>
    </Pressable>
  );
}
```

### useAnimatedStyle

```typescript
const animatedStyle = useAnimatedStyle(() => ({
  transform: [
    { scale: scale.value },
    { translateY: translateY.value },
  ],
  opacity: opacity.value,
}));
```

### withTiming / withSpring / withDecay

```typescript
import { withTiming, withSpring, withDecay, withSequence, withDelay } from "react-native-reanimated";

// Timing (tween)
opacity.value = withTiming(0, { duration: 250 });

// Spring (physics)
scale.value = withSpring(1.1, { stiffness: 300, damping: 20 });

// Decay (momentum after drag, like scroll)
offset.value = withDecay({ velocity: velocity.value, deceleration: 0.998 });

// Sequence
scale.value = withSequence(
  withSpring(1.2, { damping: 10 }),
  withDelay(100, withSpring(1, { damping: 15 }))
);
```

### Gestures (Pan, Pinch, Tap)

```typescript
import { Gesture, GestureDetector } from "react-native-gesture-handler";

const pan = Gesture.Pan()
  .onUpdate((e) => {
    translateX.value = e.translationX;
    translateY.value = e.translationY;
  })
  .onEnd(() => {
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
  });

return (
  <GestureDetector gesture={pan}>
    <Animated.View style={animatedStyle}>
      <Text>Drag me</Text>
    </Animated.View>
  </GestureDetector>
);
```

### Entering / Exiting Animations

```typescript
import { entering, exiting } from "react-native-reanimated";

// Built-in
<Animated.View entering={FadeIn} exiting={FadeOut}>
  <Text>Fade in/out</Text>
</Animated.View>

// Custom
<Animated.View
  entering={withTiming((targetValues) => ({
    opacity: targetValues.opacity,
    transform: [{ translateY: withSpring(0, { damping: 15 }) }],
  }), { duration: 400 })}
>
  <Text>Custom entrance</Text>
</Animated.View>
```

### Shared Element Transitions

```typescript
import { SharedTransition } from "react-native-reanimated";

const customTransition = SharedTransition.custom((values) => {
  "worklet";
  return {
    height: withSpring(values.targetHeight),
    width: withSpring(values.targetWidth),
    originX: withSpring(values.targetOriginX),
    originY: withSpring(values.targetOriginY),
  };
});

// List screen
<Animated.View sharedTransitionTag="image" sharedTransitionStyle={customTransition}>
  <Image source={thumb} />
</Animated.View>

// Detail screen
<Animated.View sharedTransitionTag="image" sharedTransitionStyle={customTransition}>
  <Image source={fullImage} />
</Animated.View>
```

## Performance Rules

1. **Always** put animation logic in `worklet` (runs on UI thread)
2. **Never** call JS functions from inside `useAnimatedStyle`
3. **Use** `runOnJS()` to call back to JS thread when needed
4. **Avoid** `setNativeProps` — use shared values instead
