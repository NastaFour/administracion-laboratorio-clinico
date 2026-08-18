---
name: react-native
description: Guidelines for cross-platform React Native development. Enforces Single Responsibility (SRP) for layouts, custom hooks separation, optimized list renders, and secure Expo structures. Use when developing or modifying views, navigation layouts, or native flows for the mobile client app.
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires Node 20+ and pnpm 9+."
allowed-tools: Bash(node:*) Read
metadata:
  trigger: ["react native", "flatlist", "native component", "mobile"]
  scope: [global, project]
  version: "1.0.0"
---

# 📱 React Native Development (Mobile Client)

Use this skill when developing or modifying views, navigation layouts, catalogs, or native flows for the [APP] mobile client app.

---

## 🏛️ Single Responsibility Principle (SRP) in Mobile Views

To maintain readability and prevent technical debt:

1. **Decouple Layout from State**:
   - Extract raw UI elements (grocery catalog card designs, user profile layouts) into presenter components that only consume structured props.
   - Do not perform asynchronous checkout calls, API calls, or socket subscriptions inside layout rendering files.
   - Separate state operations into custom hooks (e.g. `useCartState()`, `useDeliveryRoute(orderId)`).

2. **Modular Style Blocks**:
   - Keep stylesheet structures clean. Group styling rules in dedicated StyleSheets or utility layouts. Do not mix inline style functions with data mutations.

---

## 🚨 React Native Standards

1. **Native Component Priority**:
   - Use only native layout components (`View`, `Text`, `SafeAreaView`, `Pressable`, `ActivityIndicator`).
   - Avoid nesting native scrollable lists (`ScrollView`, `FlatList`) to prevent layout freezes.

2. **Optimized List Rendering**:
   - The the product catalog will contain hundreds of items. Always render catalogs using `FlatList` instead of raw JS array mapping.
   - Configure memory optimization parameters:
     ```typescript
     <FlatList
       data={products}
       keyExtractor={(item) => item.id}
       renderItem={({ item }) => <ProductCard product={item} />}
       initialNumToRender={10}
       maxToRenderPerBatch={10}
       windowSize={5}
       removeClippedSubviews={true}
     />
     ```

3. **Platform-Specific Logic**:
   - Use `Platform.OS` or platform extensions (`.ios.tsx`, `.android.tsx`) to manage differences (e.g. status bar heights or notch zones).
   - Wrap inputs inside a `KeyboardAvoidingView` to prevent the device keyboard from hiding inputs during registration or checkouts.

---

## 🛒 [APP] Mobile Features

- **Product Detail Overlay**: Use fluid layouts to slide detailed descriptions up when tapping a grocery item card.
- **Cart Summary Panel**: Display a bottom sheet showing active item totals, tax calculations, and delivery address fields.
- **Real-Time GPS Map**: Integrate `react-native-maps` with clean custom markers representing the the storefront node and the courier's location. Prevent rapid state updates from freezing the map thread (interpolate changes or throttle location updates).
- **Offline Mode Indicators**: Show a warning toast if the device connection drops (`NetInfo`), and disable order placements.
