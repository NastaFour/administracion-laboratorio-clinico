---
name: state-management
description: DEPRECATED. Use zustand-5 instead. Legacy conceptual state-management overview kept for retrocompatibility. The skill-router ignores this skill.
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires Node 20+ and pnpm 9+."
allowed-tools: Bash(node:*) Read
deprecated: true
redirect: zustand-5
metadata:
  trigger: ["state management legacy", "conceptual store deprecated"]
  scope: [global, project]
  version: "1.0.0"
---

# 🗃️ State Management — Zustand + React Query

Usa este skill al implementar manejo de estado en el Admin Panel (React/Vite) o la App Móvil (React Native/Expo).

---

## 🎯 Stack por Plataforma

| Plataforma | Estado Cliente | Estado Servidor | Persistencia |
|---|---|---|---|
| Admin Panel (React/Vite) | Zustand | TanStack Query (React Query v5) | `zustand/middleware/persist` (localStorage) |
| App Móvil (Expo) | Zustand | TanStack Query | `zustand/middleware/persist` (AsyncStorage → SecureStore para datos sensibles) |

---

## 🏪 Patrón: Zustand Store (Carrito de Compras)

```typescript
// apps/mobile-app/src/stores/cart.store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

interface CartStore {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, delta: number) => void;
  clearCart: () => void;
  total: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => set((state) => {
        const existing = state.items.find(i => i.productId === item.productId);
        if (existing) {
          return {
            items: state.items.map(i =>
              i.productId === item.productId
                ? { ...i, quantity: i.quantity + item.quantity }
                : i
            ),
          };
        }
        return { items: [...state.items, item] };
      }),
      removeItem: (productId) => set((state) => ({
        items: state.items.filter(i => i.productId !== productId),
      })),
      updateQuantity: (productId, delta) => set((state) => ({
        items: state.items.map(i =>
          i.productId === productId
            ? { ...i, quantity: Math.max(0, i.quantity + delta) }
            : i
        ).filter(i => i.quantity > 0),
      })),
      clearCart: () => set({ items: [] }),
      total: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    }),
    {
      name: 'mercado-cart',
      storage: {
        getItem: async (name) => {
          const value = await AsyncStorage.getItem(name);
          return value ? JSON.parse(value) : null;
        },
        setItem: async (name, value) => {
          await AsyncStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: async (name) => {
          await AsyncStorage.removeItem(name);
        },
      },
    }
  )
);
```

---

## 🌐 Patrón: React Query (Catálogo de Productos)

```typescript
// apps/admin-panel/src/hooks/useInventory.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export function useInventory() {
  return useQuery({
    queryKey: ['products'],
    queryFn: () => api.get('/api/products').then(res => res.data),
    staleTime: 5 * 60 * 1000, // 5 minutos de caché fresco
  });
}

export function useUpdateStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, delta }: { productId: string; delta: number }) =>
      api.patch(`/api/products/${productId}/stock`, { delta }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
```

---

## 🎨 Patrón de Estados (Loading / Empty / Error / Data)

```typescript
// Componente reutilizable con 4 estados
import { useInventory } from '../hooks/useInventory';

export function InventoryView() {
  const { data: products, isLoading, isError, error } = useInventory();

  if (isLoading) return <SkeletonTable rows={5} />;
  if (isError) return <ErrorBanner message={error.message} onRetry={() => {}} />;
  if (!products?.length) return <EmptyState icon="📦" message="No hay productos en inventario" />;

  return <InventoryTable products={products} />;
}
```

---

## 🚦 Reglas

- **Nunca** mezclar lógica de fetching en componentes presentacionales — extraer a hooks
- **Nunca** guardar tokens o datos sensibles en stores persistidos sin cifrar
- **Siempre** respetar SRP: stores separados por dominio (`cart.store`, `auth.store`, `inventory.store`)
- **Siempre** invalidar queries tras mutaciones (`queryClient.invalidateQueries`)
- Consultar `../06-code-quality/solid-clean-code/SKILL.md` para SRP en hooks
- Consultar `../05-frontend/react-vite/SKILL.md` para patrones de componentes
