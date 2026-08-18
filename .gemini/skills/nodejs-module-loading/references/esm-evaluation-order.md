# ES Module Evaluation Order

## The Problem (Bug #8)

```typescript
// server.ts
import { env } from "./env";      // Line 1: env.ts is imported FIRST
import express from "express";
                                  // env.ts is evaluated HERE (before line 18)
dotenv.config();                  // Line 18: TOO LATE — env.ts already ran with undefined vars
```

```typescript
// env.ts
import { z } from "zod";

export const env = {
  DATABASE_URL: process.env.DATABASE_URL,  // undefined! dotenv not loaded yet
  JWT_SECRET: process.env.JWT_SECRET,      // undefined!
};
```

## Why This Happens

ES modules evaluate in this order:

```
1. Parse all import statements (static)
2. Evaluate imported modules (depth-first, in import order)
3. Evaluate the current module's own code
```

So when `server.ts` imports `env.ts` on line 1:
- `env.ts` is parsed and evaluated BEFORE `server.ts` line 18 runs
- `env.ts` reads `process.env` → all undefined (dotenv hasn't run)
- Then `server.ts` line 18 runs `dotenv.config()` → too late, `env` is already computed

```
┌─────────────────────────────────────────────────────────┐
│  server.ts evaluation order                             │
│                                                         │
│  1. Parse imports: env.ts, express, ...                 │
│  2. Evaluate env.ts                                     │
│     └─ env.ts reads process.env → undefined             │
│        (dotenv.config() hasn't run yet)                 │
│  3. Evaluate server.ts own code                         │
│     └─ dotenv.config() runs → vars loaded               │
│        but env object already has undefined values      │
└─────────────────────────────────────────────────────────┘
```

## The Fix

Put `import "dotenv/config"` as the FIRST import in `env.ts`:

```typescript
// env.ts
import "dotenv/config";           // Line 1: loads .env into process.env FIRST
import { z } from "zod";

export const env = {
  DATABASE_URL: process.env.DATABASE_URL,  // ✅ defined
  JWT_SECRET: process.env.JWT_SECRET,      // ✅ defined
};
```

Now the order is:
```
1. env.ts: import "dotenv/config" → .env loaded into process.env
2. env.ts: read process.env → vars are defined ✅
3. server.ts: import env → gets correct values
```

## Anti-Pattern: dotenv.config() in server.ts

**Never do this**:
```typescript
// server.ts
import { env } from "./env";
import dotenv from "dotenv";
dotenv.config();  // ❌ TOO LATE
```

**Always do this**:
```typescript
// env.ts (the module that reads process.env)
import "dotenv/config";  // ✅ FIRST import
// ... then read process.env
```

## CommonJS vs ESM

| Aspect | CommonJS (require) | ESM (import) |
|---|---|---|
| Loading | Synchronous, on-demand | Static, hoisted |
| `dotenv.config()` location | Can be before `require()` | Must be `import "dotenv/config"` before any import that reads env |
| Evaluation | Top-to-bottom | Imports first, then module code |

In CommonJS:
```javascript
// server.cjs — this works in CJS but NOT in ESM
const dotenv = require("dotenv");
dotenv.config();           // runs first
const { env } = require("./env");  // env.cjs reads process.env after
```

In ESM, the equivalent does NOT work because imports are hoisted.

## Rule Summary

> **Rule**: The module that reads `process.env` must import `"dotenv/config"` as its first import. Never rely on `dotenv.config()` in a parent module (like `server.ts`) to load env vars for an imported child module (like `env.ts`).
