---
name: microservices
description: Guidelines for Microservice architectures. Covers boundaries definition, API gateway routing, inter-service calls, correlation-id propagation, and failure isolation. Use when decoupling features, designing distributed systems, or splitting a monolith into services.
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires Node 20+ and pnpm 9+."
allowed-tools: Bash(node:*) Read
metadata:
  trigger: ["microservicios", "API gateway", "circuit breaker", "correlation-id"]
  scope: [global, project]
  version: "1.0.0"
---

# 🏗️ Microservices Architecture Design

Use this skill when decoupling features or designing distributed systems for the [APP] project.

## 🚨 Architectural Boundaries

1. **Logical Separation of Domains**:
   - Split core business domains into isolated services. In the [APP], boundaries include:
     - **Auth Service**: User logins, registrations, and token issuance.
     - **Catalog/Inventory Service**: Product stock, category updates, and low-stock triggers.
     - **Order/Checkout Service**: Shopping carts, checkout calculations, and order creation.
     - **Delivery/Dispatch Service**: Routing, driver assignment, and live location updates.
     - **Support Service**: Ticket management, customer chat, and refund processes.

2. **Database Per Service**:
   - Each microservice must own its database schema. A service must never access another service's database directly. Use API calls or event buses for data syncing.

3. **API Gateway Routing**:
   - Implement an API Gateway (e.g. Nginx proxy or Node-based Gateway) as the single entry point. Routing examples:
     - `/api/auth/*` -> Auth Service
     - `/api/products/*` -> Inventory Service
     - `/api/orders/*` -> Checkout Service

## 📡 Communication & Event-Driven Flows

1. **Async Communication (Event Bus)**:
   - Use RabbitMQ or Redis Pub/Sub for background communications (e.g., when an order is created, emit `order.created` so the Inventory Service can subtract stock and the Delivery Service can find a courier).

2. **Sync Communication**:
   - Use HTTP/REST or gRPC for direct queries. Secure these calls with inter-service tokens (HMAC signature or specific API Keys).

3. **Correlation-ID Tracing**:
   - Every request entering the gateway must be assigned a unique `correlation-id` header.
   - This header must be propagated in every HTTP call, socket emission, or message queue payload. Include it in all logs (via Winston/Pino) to simplify troubleshooting across services.

## 🔒 Security & Circuit Breakers

1. **Token Propagation**:
   - Pass the JWT token from the gateway to downstream microservices, or decode it at the gateway and inject user details (`x-user-id`, `x-user-role`) into headers.

2. **Failure Isolation**:
   - Implement **circuit breakers** (using packages like `opossum`) for synchronous API calls. If a service goes offline, return a friendly fallback error response instead of cascading the failure.
