# Mobile Page Transitions (React Navigation)

## Custom Screen Transitions

```typescript
import { TransitionSpecs, CardStyleInterpolators } from "@react-navigation/stack";

const customTransition = {
  gestureDirection: "horizontal",
  transitionSpec: {
    open: TransitionSpecs.TransitionIOSSpec.SpringSpec,
    close: TransitionSpecs.TransitionIOSSpec.SpringSpec,
  },
  cardStyleInterpolator: ({ current, next, layouts }) => {
    return {
      cardStyle: {
        transform: [
          {
            translateX: current.progress.interpolate({
              inputRange: [0, layouts.screen.width],
              outputRange: [layouts.screen.width, 0],
            }),
          },
        ],
      },
      overlayStyle: {
        opacity: current.progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 0.5],
        }),
      },
    };
  },
};

const Stack = createStackNavigator();

function App() {
  return (
    <Stack.Navigator screenOptions={{ ...customTransition }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Detail" component={DetailScreen} />
    </Stack.Navigator>
  );
}
```

## Shared Element Transitions (Reanimated)

```typescript
import { SharedTransition } from "react-native-reanimated";

// Define the transition
const sharedTransition = SharedTransition.custom((values) => {
  "worklet";
  return {
    height: withSpring(values.targetHeight, { damping: 20 }),
    width: withSpring(values.targetWidth, { damping: 20 }),
    originX: withSpring(values.targetOriginX, { damping: 20 }),
    originY: withSpring(values.targetOriginY, { damping: 20 }),
  };
});

// List screen
function ListScreen({ navigation }) {
  return (
    <View>
      {items.map(item => (
        <Pressable key={item.id} onPress={() => navigation.navigate("Detail", { id: item.id })}>
          <Animated.View
            sharedTransitionTag={`card-${item.id}`}
            sharedTransitionStyle={sharedTransition}
          >
            <Image source={{ uri: item.image }} style={styles.image} />
          </Animated.View>
        </Pressable>
      ))}
    </View>
  );
}

// Detail screen
function DetailScreen({ route }) {
  const { id } = route.params;
  const item = getItem(id);

  return (
    <Animated.View
      sharedTransitionTag={`card-${id}`}
      sharedTransitionStyle={sharedTransition}
    >
      <Image source={{ uri: item.image }} style={styles.fullImage} />
    </Animated.View>
  );
}
```

## Bottom Sheet Modal Transition

```typescript
const bottomSheetTransition = {
  gestureDirection: "vertical",
  transitionSpec: {
    open: { animation: "timing", config: { duration: 300 } },
    close: { animation: "timing", config: { duration: 200 } },
  },
  cardStyleInterpolator: ({ current, layouts }) => ({
    cardStyle: {
      transform: [{
        translateY: current.progress.interpolate({
          inputRange: [0, 1],
          outputRange: [layouts.screen.height, 0],
        }),
      }],
    },
    overlayStyle: {
      opacity: current.progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 0.5],
      }),
    },
  }),
};
```

## Fade Transition (Simple)

```typescript
const fadeTransition = {
  transitionSpec: {
    open: { animation: "timing", config: { duration: 250 } },
    close: { animation: "timing", config: { duration: 150 } },
  },
  cardStyleInterpolator: ({ current }) => ({
    cardStyle: { opacity: current.progress },
  }),
};
```
