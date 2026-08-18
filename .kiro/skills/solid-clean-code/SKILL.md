---
name: solid-clean-code
description: Enforces software engineering quality and clean coding principles. Covers SOLID, DRY, and KISS guidelines applied to TypeScript, React, and Node.js to minimize technical debt. Use when reviewing or writing code to keep functions ≤40 lines, avoid `any`, and enforce SRP.
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires Node 20+ and pnpm 9+."
allowed-tools: Bash(node:*) Read
metadata:
  trigger: ["SOLID", "DRY", "KISS", "clean code", "SRP"]
  scope: [global, project]
  version: "1.0.0"
---

# 📐 SOLID & Clean Code Standards (DRY / KISS)

Use this skill to guide code structures, refactoring loops, or style audits. It ensures that the AI generates clean, understandable, and highly optimized code without convoluted logic.

---

## 🏛️ 1. SOLID Principles in Full-Stack TypeScript

### 🟢 Single Responsibility Principle (SRP)
* **Rule**: A class, file, or component must have exactly **one reason to change**.
* **React**: Separate visual layouts from state fetchers. Keep custom hooks (e.g., `useDeliverySocket`) separated from presenter UI grids.
* **Express**: Controllers should only delegate actions. Keep database queries (Prisma) inside separate repository files and keep validation logic inside schemas (Zod).

### 🟢 Open/Closed Principle (OCP)
* **Rule**: Software entities should be **open for extension, but closed for modification**.
* **Practice**: Add new payment methods, delivery dispatchers, or support filters by extending interfaces or implementing factory patterns. Do not modify the core controller.
  ```typescript
  // Extendable Payment Dispatcher
  export interface PaymentGateway {
    process(amount: number): Promise<boolean>;
  }
  ```

### 🟢 Liskov Substitution Principle (LSP)
* **Rule**: Objects of a superclass must be replaceable with objects of a subclass without breaking correctness.
* **Practice**: All payment adapters (e.g. Stripe, PayPal, local terminal mockup) must implement `PaymentGateway` and share identical return signatures. A driver should be able to swap them interchangeably.

### 🟢 Interface Segregation Principle (ISP)
* **Rule**: Clients should not be forced to depend on methods they do not use.
* **Practice**: Split bloated data contracts. A delivery routing system only needs coordinates, not the buyer's full purchase checkout history. Define restricted interfaces.
  ```typescript
  export interface Routable {
    id: string;
    deliveryAddress: string;
    coordinates?: { latitude: number; longitude: number };
  }
  ```

### 🟢 Dependency Inversion Principle (DIP)
* **Rule**: Depend on abstractions (interfaces), not on concrete implementations.
* **Practice**: Controllers should call the `PaymentGateway` interface instead of calling `new StripePayment()`. This makes testing easy by swapping implementations with mocks.

---

## ♻️ 2. DRY (Don't Repeat Yourself)

1. **Shared Workspace Modules**:
   - Common validation schemas (Zod) and TypeScript models must reside in the `@scope/shared-types` package.
   - Do not duplicate data structures between `apps/backend`, `apps/admin-panel`, and `apps/mobile-app`.
2. **Encapsulate Common Routines**:
   - Wrap cookie parsing, error mapping, and coordinate calculations in single helper modules inside `packages/shared-utils`.

---

## 🧠 3. KISS (Keep It Simple, Stupid)

1. **Avoid Over-Engineering**:
   - Write clean, straightforward logic. Do not install heavy state machines or libraries (like Redux or RxJS) for simple state bindings.
   - Use standard React state (`useState`/`useContext`) and vanilla JS array operations.
2. **Cognitive Load Minimization**:
   - Keep functions shorter than 40 lines. If a function does more, extract sub-helpers.
   - Variable and function names must declare their exact purpose (e.g., `updateInventoryStock` rather than `handleInv`).

---

## 🔄 4. Incremental Refactoring Loop

- Perform changes in atomic commits. Never change logic behavior and performance attributes simultaneously.
- When cleaning code:
  1. Confirm the happy-path automated test suite passes.
  2. Perform code cleanup (renaming variables, extracting sub-components).
  3. Re-run tests to confirm zero regression.
