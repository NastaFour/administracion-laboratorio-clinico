---
name: typescript
description: Guidelines for strict TypeScript development. Enforces precise type safety, prevents 'any', and implements SOLID principles (ISP/DIP) in class and interface contracts. Use when writing TypeScript types, narrowing `unknown`, or designing interface contracts.
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires Node 20+ and pnpm 9+."
allowed-tools: Bash(node:*) Read
metadata:
  trigger: ["typescript", "tipos", "interface", "strict", "no any"]
  scope: [global, project]
  version: "1.0.0"
---

# 🛡️ Strict TypeScript Safety Guidelines

Use this skill when defining models, API responses, websocket events, or helper functions. Strict typing is required across both mobile and web clients.

---

## 🚨 TypeScript Standards

1. **Zero Implicit Any**:
   - `any` is strictly prohibited. If a type is unknown or dynamic, use `unknown` and perform type checking before access.
   - Run compiler checks with `"noImplicitAny": true` and `"strict": true` in `tsconfig.json`.

2. **Explicit Function Signatures**:
   - Every function, helper, or custom hook must declare its parameter types and return type explicitly.
   - Do not rely on implicit return type inference for core business logic.

3. **Interface over Types**:
   - Use `interface` for data structures and class contracts to support declaration merging and cleaner error diagnostics.
   - Use `type` only for unions, intersections, and aliases (e.g. `type OrderStatus = 'PENDING' | 'PACKING' | 'SHIPPED' | 'DELIVERED'`).

---

## 🏛️ SOLID Interface Guidelines

### 🟢 Interface Segregation (ISP)
- Create specific, focused interfaces instead of single, massive, multi-purpose types.
- A courier system only needs `RoutableOrder` coordinates. A warehouse packaging dashboard only needs `PackableOrder` checklist arrays.
  ```typescript
  // segregate interfaces:
  export interface RoutableOrder {
    id: string;
    deliveryAddress: string;
    coordinates?: { latitude: number; longitude: number };
  }

  export interface PackableOrder {
    id: string;
    items: Array<{ productId: string; quantity: number }>;
  }
  ```

### 🟢 Dependency Inversion (DIP)
- Define abstractions (interfaces) for data storage, payment, or notification services. Concrete classes must implement these interfaces.
- High-level modules must only import the abstraction (interface) definitions.
  ```typescript
  // Repository interface abstraction
  export interface OrderRepository {
    fetchById(id: string): Promise<Order | null>;
    save(order: Order): Promise<void>;
  }
  ```

---

## 🛒 [APP] Core Type Definitions

All components must import or adhere to these core structures:

```typescript
export type OrderStatus = 'PENDING' | 'PACKING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  imageUrl: string;
  category: string;
  updatedAt: Date;
}

export interface OrderItem {
  productId: string;
  product: Product;
  quantity: number;
  priceAtPurchase: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'BUYER' | 'EMPLOYEE' | 'DELIVERY' | 'ADMIN';
}

export interface Order {
  id: string;
  buyerId: string;
  buyer: User;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  deliveryAddress: string;
  deliveryCoordinates?: {
    latitude: number;
    longitude: number;
  };
  deliveryUserId?: string;
  createdAt: Date;
}
```
