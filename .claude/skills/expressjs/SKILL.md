---
name: expressjs
description: Guidelines for Express.js API development. Enforces route modularization, Zod body validation, secure JWT middleware, rate-limiting, and error-handling structures. Use when creating or modifying HTTP routes, REST endpoints, middlewares, or error boundaries.
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires Node 20+ and pnpm 9+."
allowed-tools: Bash(node:*) Read
metadata:
  trigger: ["express", "API REST", "middleware", "ruta", "endpoint"]
  scope: [global, project]
  version: "1.0.0"
---

# 🚀 Express.js API Development

Use this skill when defining HTTP routes, REST endpoints, middlewares, or error boundaries for the [APP] backend.

## 🚨 API Implementation Standards

1. **Express version 4.19+ / 5.0 Guidelines**:
   - Do not use deprecated destructurings of `req.body`.
   - Take advantage of Native Async Error Handling if using v5.0; otherwise, wrap async route handlers in a helper function (`asyncHandler`) to guarantee errors propagate to the global error middleware.

2. **Zod Validation Middleware**:
   - Every POST/PUT request body must be parsed and validated through a Zod schema before executing controllers:
     ```javascript
     export const validate = (schema) => (req, res, next) => {
       try {
         req.body = schema.parse(req.body);
         next();
       } catch (err) {
         res.status(400).json({ error: 'Validation Failed', details: err.errors });
       }
     };
     ```

3. **Global Error Middleware**:
   - Set up a single global catch-all middleware in `app.js` to log errors as JSON and return appropriate status codes:
     ```javascript
     app.use((err, req, res, next) => {
       logger.error({ err, correlationId: req.headers['x-correlation-id'] });
       res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
     });
     ```

## 🔒 Security & Protection

1. **Authentication Middleware**:
   - Extract access tokens from request headers (Authorization Bearer) or cookies.
   - For sensitive admin operations, authenticate the employee's ID and verify they have the required role (`EMPLOYEE`, `ADMIN`).

2. **Rate Limiting**:
   - Use `express-rate-limit` on critical endpoints:
     - Authentication (`/api/auth/login`, `/api/auth/register`): 100 requests per 15 minutes.
     - Authenticated routes (cart checkouts, updates): 1000 requests per 15 minutes (using `req.user.id` as key, falling back to `req.ip`).

3. **Security Headers & CORS**:
   - Use `helmet` to set CSP and disable information leak headers like `X-Powered-By`.
   - Configure `cors` with an explicit whitelist of origins (e.g. your admin web app domain and client app URL). NEVER set `origin: '*'`.

## 🛒 [APP] Endpoint Map

Isolate route controllers according to business areas:
- `/api/auth`: Login, Register, token refresh.
- `/api/products`: Public catalogs, and admin inventory update routes (restricted to `EMPLOYEE`).
- `/api/orders`: Order creation (restricted to `BUYER`), packer checklist fetch (restricted to `EMPLOYEE`), and order delivery status dispatch.
- `/api/support`: Live support ticket opening and status resolver.
