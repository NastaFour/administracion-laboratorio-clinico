---
name: error-handling
description: Defines error handling patterns across the stack: Result types, Express error middleware, React error boundaries, and Socket.io error events. Use when implementing error handling, debugging error flows, or creating custom error classes.
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires Node 20+ and pnpm 9+."
allowed-tools: Bash(node:*) Read
metadata:
  trigger: ["error handling", "error boundary", "Result type", "try catch", "error middleware", "exception", "throw"]
  scope: [global, project]
  version: "1.0.0"
---

# 🚨 Error Handling Patterns

Use this skill when implementing error handling across backend, frontend, and mobile layers.

## 📋 When to Use

- Use when creating error handling middleware in Express
- Use when implementing Result<T, E> types for business logic
- Use when adding error boundaries in React/React Native
- Use when handling Socket.io error events
- Do NOT use for logging setup (see monitoring skill)

## 🚦 Hard Rules

- **Always** use typed error classes, never throw raw strings
- **Always** catch errors at boundaries (Express middleware, React error boundaries)
- **Always** return structured error responses from APIs (never expose stack traces in production)
- **Never** swallow errors silently (`catch {}` without handling)
- **Never** use `any` in error types — use `unknown` and narrow

## 🏗️ Backend: Result<T, E> Pattern

```typescript
// packages/shared-utils/src/result.ts
export type Result<T, E = Error> = 
  | { ok: true; value: T }
  | { ok: false; error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}
```

Usage:

```typescript
async function findOrder(id: string): Promise<Result<Order, NotFoundError>> {
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) return err(new NotFoundError(`Order ${id} not found`));
  return ok(order);
}
```

## 🔌 Express Error Middleware

```typescript
// apps/backend/src/middleware/error-handler.ts
import { logger } from '../lib/logger';
import type { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR',
    public isOperational: boolean = true,
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    logger.warn({ err, correlationId: req.correlationId }, err.message);
    return res.status(err.statusCode).json({
      error: { code: err.code, message: err.message },
    });
  }

  logger.error({ err, correlationId: req.correlationId }, 'Unhandled error');
  return res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
  });
}
```

## 🖥️ React Error Boundary

```tsx
// apps/admin-panel/src/components/ErrorBoundary.tsx
import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { hasError: boolean; error?: Error; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="p-4 bg-red-50 border border-red-200 rounded">
          <p className="text-red-800">Something went wrong.</p>
          <button onClick={() => this.setState({ hasError: false })}>Retry</button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

## 📡 Socket.io Error Handling

```typescript
// Server: validate + emit error
socket.on('order:create', async (data) => {
  try {
    const parsed = OrderCreateSchema.parse(data);
    const result = await createOrder(parsed);
    if (!result.ok) {
      return socket.emit('error', { code: result.error.code, message: result.error.message });
    }
    socket.emit('order:created', result.value);
  } catch (err) {
    socket.emit('error', { code: 'VALIDATION_ERROR', message: 'Invalid order data' });
  }
});

// Client: listen for errors
socket.on('error', (err) => {
  toast.error(`Server error: ${err.message}`);
});
```

## 📚 References

- [Express error handling](https://expressjs.com/en/guide/error-handling.html)
- [React Error Boundaries](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- [Socket.io error handling](https://socket.io/docs/v4/emitting-events/)
