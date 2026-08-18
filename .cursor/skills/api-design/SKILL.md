---
name: api-design
description: Defines REST API design conventions: URL structure, HTTP methods, status codes, pagination, filtering, versioning, and error response format. Use when creating new endpoints, designing API contracts, or reviewing API consistency.
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires Node 20+ and pnpm 9+."
allowed-tools: Bash(node:*) Read
metadata:
  trigger: ["API design", "REST", "endpoint", "URL structure", "HTTP methods", "API versioning", "pagination"]
  scope: [global, project]
  version: "1.0.0"
---

# 🌐 REST API Design Conventions

Use this skill when designing or reviewing REST API endpoints.

## 📋 When to Use

- Use when creating new API endpoints
- Use when designing request/response contracts with Zod
- Use when reviewing API consistency across the codebase
- Do NOT use for GraphQL or gRPC (different conventions)

## 🚦 Hard Rules

- **Always** use plural nouns for resources (`/api/products`, not `/api/product`)
- **Always** use kebab-case for URL paths (`/api/order-items`, not `/api/orderItems`)
- **Always** validate request bodies with Zod before processing
- **Always** return consistent error format (see Error Responses below)
- **Always** use proper HTTP status codes (200, 201, 204, 400, 401, 403, 404, 409, 422, 500)
- **Never** expose internal database IDs in public APIs (use UUIDs)
- **Never** return 200 for errors

## 🏗️ URL Structure

```
GET    /api/products                  → List products (paginated)
GET    /api/products/:id              → Get single product
POST   /api/products                  → Create product
PATCH  /api/products/:id              → Update product (partial)
DELETE /api/products/:id              → Delete product
GET    /api/products/:id/reviews      → List reviews for product
POST   /api/orders                    → Create order
GET    /api/orders/:id/tracking       → Get tracking for order
```

## 📄 Pagination

```typescript
// Request: GET /api/products?page=2&limit=20&sort=-createdAt
const PaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().optional(),
});

// Response format
{
  "data": [...],
  "meta": {
    "page": 2,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": true
  }
}
```

## 🔍 Filtering

```
GET /api/products?category=dairy&minPrice=1.5&inStock=true
```

```typescript
const ProductFilterSchema = z.object({
  category: z.string().optional(),
  minPrice: z.coerce.number().positive().optional(),
  maxPrice: z.coerce.number().positive().optional(),
  inStock: z.coerce.boolean().optional(),
  search: z.string().max(200).optional(),
});
```

## ❌ Error Responses

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      { "field": "email", "message": "Invalid email format" },
      { "field": "password", "message": "Must be at least 8 characters" }
    ]
  }
}
```

## 📋 HTTP Status Codes

| Code | Meaning | When to Use |
|---|---|---|
| 200 | OK | Successful GET, PATCH |
| 201 | Created | Successful POST that creates resource |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Validation error |
| 401 | Unauthorized | Missing or invalid auth |
| 403 | Forbidden | Valid auth but insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate resource (e.g., email already taken) |
| 422 | Unprocessable | Semantically invalid (e.g., negative quantity) |
| 500 | Internal Error | Unhandled server error |

## 📚 References

- [REST API Design Best Practices](https://restfulapi.net/)
- [Zod validation](https://zod.dev)
- [HTTP Status Codes](https://httpstatuses.com/)
