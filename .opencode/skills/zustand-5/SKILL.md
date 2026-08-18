---
name: zustand-5
description: Zustand 5 state management — basic stores, persist middleware, selectors with useShallow, async actions, slices pattern, Immer, devtools, outside-React access. Use when managing React state with Zustand so the AI does not regress to v4 selector patterns causing over-rendering.
license: Apache-2.0
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires Zustand 5+, React 18+."
allowed-tools: Bash(node:*) Read
metadata:
  trigger: ["zustand 5", "zustand", "state management", "persist middleware", "useShallow", "slices pattern", "immer middleware"]
  scope: [global, project]
  version: "1.0.0"
---

# Zustand 5

## Basic Store

```typescript
import { create } from "zustand";
interface CounterStore {
  count: number;
  increment: () => void;
  decrement: () => void;
  reset: () => void;
}
const useCounterStore = create<CounterStore>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
  reset: () => set({ count: 0 }),
}));
function Counter() {
  const { count, increment, decrement } = useCounterStore();
  return (<div><span>{count}</span><button onClick={increment}>+</button><button onClick={decrement}>-</button></div>);
}
```

## Persist Middleware

```typescript
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SettingsStore {
  theme: "light" | "dark";
  language: string;
  setTheme: (theme: "light" | "dark") => void;
  setLanguage: (language: string) => void;
}
const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({ theme: "light", language: "en", setTheme: (theme) => set({ theme }), setLanguage: (language) => set({ language }) }),
    { name: "settings-storage" }  // localStorage key
  )
);
```

## Selectors (Zustand 5)

```typescript
// ✅ Select specific fields to prevent unnecessary re-renders
function UserName() {
  const name = useUserStore((state) => state.name);
  return <span>{name}</span>;
}
// ✅ For multiple fields, use useShallow
import { useShallow } from "zustand/react/shallow";
function UserInfo() {
  const { name, email } = useUserStore(useShallow((state) => ({ name: state.name, email: state.email })));
  return <div>{name} - {email}</div>;
}
// ❌ AVOID: Selecting entire store (re-renders on ANY state change)
const store = useUserStore();
```

## Async Actions

```typescript
interface UserStore {
  user: User | null;
  loading: boolean;
  error: string | null;
  fetchUser: (id: string) => Promise<void>;
}
const useUserStore = create<UserStore>((set) => ({
  user: null, loading: false, error: null,
  fetchUser: async (id) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`/api/users/${id}`);
      const user = await response.json();
      set({ user, loading: false });
    } catch (error) {
      set({ error: "Failed to fetch user", loading: false });
    }
  },
}));
```

## Slices Pattern

```typescript
// userSlice.ts
interface UserSlice { user: User | null; setUser: (user: User) => void; clearUser: () => void; }
const createUserSlice = (set): UserSlice => ({ user: null, setUser: (user) => set({ user }), clearUser: () => set({ user: null }) });
// cartSlice.ts
interface CartSlice { items: CartItem[]; addItem: (item: CartItem) => void; removeItem: (id: string) => void; }
const createCartSlice = (set): CartSlice => ({
  items: [],
  addItem: (item) => set((state) => ({ items: [...state.items, item] })),
  removeItem: (id) => set((state) => ({ items: state.items.filter(i => i.id !== id) })),
});
// store.ts
type Store = UserSlice & CartSlice;
const useStore = create<Store>()((...args) => ({
  ...createUserSlice(...args),
  ...createCartSlice(...args),
}));
```

## Immer Middleware

```typescript
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

interface TodoStore { todos: Todo[]; addTodo: (text: string) => void; toggleTodo: (id: string) => void; }
const useTodoStore = create<TodoStore>()(
  immer((set) => ({
    todos: [],
    addTodo: (text) => set((state) => { state.todos.push({ id: crypto.randomUUID(), text, done: false }); }),
    toggleTodo: (id) => set((state) => { const todo = state.todos.find(t => t.id === id); if (todo) todo.done = !todo.done; }),
  }))
);
```

## DevTools

```typescript
import { create } from "zustand";
import { devtools } from "zustand/middleware";
const useStore = create<Store>()(devtools((set) => ({}), { name: "MyStore" }));
```

## Outside React

```typescript
const { count, increment } = useCounterStore.getState();
increment();
const unsubscribe = useCounterStore.subscribe((state) => console.log("Count changed:", state.count));
```

## Keywords
zustand, state management, react, store, persist, middleware