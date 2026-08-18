---
name: postgresql
description: Relational database design and optimization using PostgreSQL. Covers schema layout, strict indexing, foreign keys, query optimization, and encrypted pg_dump routines. Use when designing schemas, adding indexes, optimizing queries, or configuring backups.
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires Node 20+ and pnpm 9+."
allowed-tools: Bash(node:*) Read
metadata:
  trigger: ["postgresql", "base de datos", "índices", "ACID", "pg_dump"]
  scope: [global, project]
  version: "1.0.0"
---

# 🐘 PostgreSQL Database Design & Administration

Use this skill when defining SQL structures, indexing schemas, executing transactions, or configuring database backups.

## 🚨 Database Standards

1. **Schema Integrity**:
   - Every table must have a primary key (preferably `UUID` or autoincrementing BigInt).
   - Enforce strong referential integrity through foreign keys with explicit cascade actions (`ON DELETE RESTRICT` or `ON DELETE CASCADE`).
   - Use constraints to enforce data ranges (e.g. `stock >= 0`, `price > 0`).

2. **Index Strategy**:
   - Create indexes on fields commonly used in filtering (`WHERE`), sorting (`ORDER BY`), and joining (`JOIN` keys).
   - **[APP] Context**: Add indexes on:
     - `Order(buyerId)`
     - `Order(status)`
     - `Product(category)`
     - `SupportTicket(status)`
   - Avoid over-indexing, as it degrades performance for inserts and updates.

3. **ACID Transactions**:
   - Wrap operations that modify multiple entities in a database transaction (e.g., checkout order validation: creating an order record AND decreasing product stock simultaneously).
   - If stock is insufficient for any item in the order, roll back the transaction and return a clear error.

## 🔒 Security & Backups

1. **SQL Injection Mitigation**:
   - NEVER build SQL statements dynamically through string concatenation.
   - Always use prepared statements or parameterized queries.

2. **Automated Backups**:
   - Establish a daily automated `pg_dump` cron job.
   - Retain backups for at least 30 days.
   - Store backups in an offsite location (e.g. secure S3 bucket) separate from the main DB container.
   - Encrypt the backups using GPG or OpenSSL. Do not write unencrypted raw dumps to disk.

## 🛒 [APP] DB Schema Model

El schema SQL completo está en [`references/schema-reference.md`](references/schema-reference.md). Cárgalo solo cuando necesites crear o modificar tablas.
```
